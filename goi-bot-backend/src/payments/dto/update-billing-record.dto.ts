import { IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateBillingRecordDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  billing_status?: string;

  @IsOptional()
  @IsString()
  error_message?: string | null;

  @IsOptional()
  @IsNumber()
  customer_price?: number;

  @IsOptional()
  @IsNumber()
  courier_payment?: number;

  @IsOptional()
  @IsNumber()
  platform_fee?: number;
}
