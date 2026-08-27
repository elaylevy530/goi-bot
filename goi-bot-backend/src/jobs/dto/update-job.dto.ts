import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  order_number?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  pickup_address?: string;

  @IsOptional()
  @IsString()
  dropoff_address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  payment?: string;

  @IsOptional()
  @IsString()
  delivery_status?: string;

  @IsOptional()
  @IsString()
  courier_step?: string;

  @IsOptional()
  @IsString()
  selected_courier_id?: string;

  @IsOptional()
  @IsBoolean()
  per_job_paid?: boolean;

  @IsOptional()
  @IsNumber()
  per_job_amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  paypal_order_id?: string | null;

  @IsOptional()
  @IsNumber()
  pickup_lat?: number | null;

  @IsOptional()
  @IsNumber()
  pickup_lng?: number | null;

  @IsOptional()
  @IsNumber()
  dropoff_lat?: number | null;

  @IsOptional()
  @IsNumber()
  dropoff_lng?: number | null;

  @IsOptional()
  @IsString()
  pickup_area?: string | null;

  @IsOptional()
  @IsString()
  dropoff_area?: string | null;
}
