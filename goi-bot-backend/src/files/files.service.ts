import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createReadStream } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import { extname, resolve, sep } from "path";
import { randomUUID } from "crypto";

export const FILE_BUCKETS = [
  "chat-attachments",
  "guest-order-photos",
  "courier-avatars",
  "business-logos",
  "courier-ids",
] as const;
export type FileBucket = (typeof FILE_BUCKETS)[number];

const PRIVATE_BUCKETS = new Set<FileBucket>(FILE_BUCKETS);

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class FilesService {
  private readonly root: string;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.root = resolve(config.get<string>("files.uploadDir") ?? "./uploads");
  }

  assertBucket(value: string): FileBucket {
    if (!FILE_BUCKETS.includes(value as FileBucket)) {
      throw new BadRequestException("Unknown file bucket");
    }
    return value as FileBucket;
  }

  private safePath(bucket: FileBucket, path: string) {
    const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized || normalized.split("/").includes("..")) {
      throw new BadRequestException("Invalid file path");
    }
    const bucketRoot = resolve(this.root, bucket);
    const absolute = resolve(bucketRoot, normalized);
    if (!absolute.startsWith(`${bucketRoot}${sep}`)) {
      throw new BadRequestException("Invalid file path");
    }
    return { normalized, absolute };
  }

  async upload(bucketValue: string, file?: UploadFile) {
    const bucket = this.assertBucket(bucketValue);
    if (!file) throw new BadRequestException("file is required");
    const extension = extname(file.originalname).replace(/[^.\w-]/g, "").slice(0, 16);
    const path = `${Date.now()}-${randomUUID()}${extension}`;
    const { absolute } = this.safePath(bucket, path);
    await mkdir(resolve(this.root, bucket), { recursive: true });
    await writeFile(absolute, file.buffer);
    return {
      bucket,
      path,
      url: `/api/files/${bucket}/${path}`,
      contentType: file.mimetype,
      size: file.size,
    };
  }

  authorizeRead(
    bucketValue: string,
    path: string,
    authorization?: string,
    token?: string,
  ): FileBucket {
    const bucket = this.assertBucket(bucketValue);
    if (!PRIVATE_BUCKETS.has(bucket)) return bucket;
    const bearer = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    if (bearer) {
      try {
        this.jwt.verify(bearer);
        return bucket;
      } catch {
        // A valid signed URL may still accompany a stale bearer token.
      }
    }
    if (token) {
      try {
        const payload = this.jwt.verify<{ filePath?: string }>(token);
        if (payload.filePath === `${bucket}/${path}`) return bucket;
      } catch {
        // Fall through to a single non-disclosing authorization response.
      }
    }
    throw new ForbiddenException("File access denied");
  }

  async open(bucket: FileBucket, path: string) {
    const resolved = this.safePath(bucket, path);
    try {
      const metadata = await stat(resolved.absolute);
      if (!metadata.isFile()) throw new NotFoundException("File not found");
      return { ...resolved, size: metadata.size, stream: createReadStream(resolved.absolute) };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException("File not found");
    }
  }

  async remove(bucketValue: string, path: string) {
    const bucket = this.assertBucket(bucketValue);
    const resolved = this.safePath(bucket, path);
    await rm(resolved.absolute, { force: true });
    return { ok: true as const };
  }

  signedUrl(bucketValue: string, path: string, expiresIn: string | number = "15m") {
    const bucket = this.assertBucket(bucketValue);
    const safe = this.safePath(bucket, path).normalized;
    const token = this.jwt.sign(
      { filePath: `${bucket}/${safe}`, purpose: "file" },
      { expiresIn: expiresIn as never },
    );
    return {
      url: `/api/files/${bucket}/${safe}?token=${encodeURIComponent(token)}`,
    };
  }
}
