import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  job_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  job_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  pricing_type?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_name?: string;

  @IsOptional()
  @IsString()
  pickup_address?: string;

  @IsOptional()
  @IsString()
  pickup_area?: string;

  @IsOptional()
  @IsString()
  dropoff_address?: string;

  @IsOptional()
  @IsString()
  dropoff_area?: string;

  @IsOptional()
  @IsString()
  recipient_name?: string;

  @IsOptional()
  @IsString()
  recipient_phone?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  payment?: string;

  @IsOptional()
  @IsString()
  guest_name?: string;

  @IsOptional()
  @IsString()
  guest_phone?: string;
}
