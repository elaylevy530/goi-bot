import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import { mkdir, rm, stat, writeFile } from "fs/promises";
import { extname, resolve, sep } from "path";
import { randomUUID } from "crypto";
import type { Readable } from "stream";

export const FILE_BUCKETS = [
  "chat-attachments",
  "guest-order-photos",
  "courier-avatars",
  "business-logos",
  "courier-ids",
] as const;
export type FileBucket = (typeof FILE_BUCKETS)[number];

const PRIVATE_BUCKETS = new Set<FileBucket>(FILE_BUCKETS);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/pdf",
]);
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class FilesService {
  private readonly root: string;
  private readonly s3?: S3Client;
  private readonly s3Bucket?: string;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.root = resolve(config.get<string>("files.uploadDir") ?? "./uploads");
    const bucket = config.get<string>("files.s3.bucket");
    const endpoint = config.get<string>("files.s3.endpoint");
    const accessKeyId = config.get<string>("files.s3.accessKeyId");
    const secretAccessKey = config.get<string>("files.s3.secretAccessKey");
    if (bucket && endpoint && accessKeyId && secretAccessKey) {
      this.s3Bucket = bucket;
      this.s3 = new S3Client({
        region: config.get<string>("files.s3.region") || "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
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

  private objectKey(bucket: FileBucket, path: string) {
    return `${bucket}/${this.safePath(bucket, path).normalized}`;
  }

  private assertUpload(file: UploadFile) {
    if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("File too large");
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }
  }

  async uploadBase64(
    bucketValue: string,
    data: string,
    mimeHint?: string | null,
    originalname = "upload",
  ) {
    const trimmed = data.trim();
    const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    const mimetype = (match?.[1] || mimeHint || "").toLowerCase();
    const payload = match?.[2] ?? trimmed;
    const buffer = Buffer.from(payload, "base64");
    const extension = MIME_EXTENSION[mimetype] ?? extname(originalname);
    return this.upload(bucketValue, {
      buffer,
      originalname: `${originalname}${extension}`,
      mimetype,
      size: buffer.length,
    });
  }

  async upload(bucketValue: string, file?: UploadFile) {
    const bucket = this.assertBucket(bucketValue);
    if (!file) throw new BadRequestException("file is required");
    this.assertUpload(file);
    const extension = extname(file.originalname).replace(/[^.\w-]/g, "").slice(0, 16);
    const path = `${Date.now()}-${randomUUID()}${extension}`;
    const { absolute } = this.safePath(bucket, path);
    if (this.s3 && this.s3Bucket) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: this.objectKey(bucket, path),
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.buffer.length,
        }),
      );
    } else {
      await mkdir(resolve(this.root, bucket), { recursive: true });
      await writeFile(absolute, file.buffer);
    }
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
    if (this.s3 && this.s3Bucket) {
      try {
        const object = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.s3Bucket,
            Key: this.objectKey(bucket, path),
          }),
        );
        if (!object.Body) throw new NotFoundException("File not found");
        return {
          ...resolved,
          size: object.ContentLength ?? 0,
          contentType: object.ContentType ?? "application/octet-stream",
          stream: object.Body as Readable,
        };
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new NotFoundException("File not found");
      }
    }
    try {
      const metadata = await stat(resolved.absolute);
      if (!metadata.isFile()) throw new NotFoundException("File not found");
      return {
        ...resolved,
        size: metadata.size,
        contentType: MIME_EXTENSION[extname(resolved.normalized)]
          ? Object.entries(MIME_EXTENSION).find(([, ext]) => ext === extname(resolved.normalized).toLowerCase())?.[0]
            ?? "application/octet-stream"
          : "application/octet-stream",
        stream: createReadStream(resolved.absolute),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException("File not found");
    }
  }

  async remove(bucketValue: string, path: string) {
    const bucket = this.assertBucket(bucketValue);
    const resolved = this.safePath(bucket, path);
    if (this.s3 && this.s3Bucket) {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: this.objectKey(bucket, path),
        }),
      );
    } else {
      await rm(resolved.absolute, { force: true });
    }
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
