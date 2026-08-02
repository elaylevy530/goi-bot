import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FilesService } from "./files.service";

type UploadedMemoryFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller("api/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post(":bucket")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @Param("bucket") bucket: string,
    @UploadedFile() file?: UploadedMemoryFile,
  ) {
    return this.files.upload(bucket, file);
  }

  @Get(":bucket/*path")
  async get(
    @Param("bucket") bucketValue: string,
    @Param("path") pathValue: string | string[],
    @Headers("authorization") authorization: string | undefined,
    @Query("token") token: string | undefined,
    @Res() response: Response,
  ) {
    const path = Array.isArray(pathValue) ? pathValue.join("/") : pathValue;
    const bucket = this.files.authorizeRead(
      bucketValue,
      path,
      authorization,
      token,
    );
    const file = await this.files.open(bucket, path);
    response.type(file.absolute);
    response.setHeader("Content-Length", String(file.size));
    file.stream.pipe(response);
  }

  @Delete(":bucket")
  @UseGuards(JwtAuthGuard)
  remove(@Param("bucket") bucket: string, @Body() body: { path: string }) {
    return this.files.remove(bucket, body.path);
  }

  @Post(":bucket/signed-url")
  @UseGuards(JwtAuthGuard)
  signedUrl(
    @Param("bucket") bucket: string,
    @Body() body: { path: string; expiresIn?: string | number },
  ) {
    return this.files.signedUrl(bucket, body.path, body.expiresIn);
  }
}
