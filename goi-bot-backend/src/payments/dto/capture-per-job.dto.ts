import { IsString, IsUUID, MinLength } from "class-validator";

export class CapturePerJobDto {
  @IsUUID()
  job_id!: string;

  @IsString()
  @MinLength(4)
  order_id!: string;

  @IsString()
  @MinLength(4)
  capture_id!: string;
}
