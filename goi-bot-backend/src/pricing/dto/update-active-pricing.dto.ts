import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateActivePricingDto {
  @IsNumber()
  @Min(0)
  base_price!: number;

  @IsNumber()
  @Min(0)
  price_per_km!: number;

  @IsNumber()
  @Min(0)
  minimum_price!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  platform_fee_percent!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  platform_fee_fixed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waiting_fee_per_minute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extra_stop_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heavy_package_surcharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  night_surcharge_percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weekend_surcharge_percent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
