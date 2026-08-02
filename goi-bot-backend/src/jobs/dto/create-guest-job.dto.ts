import { Type } from "class-transformer";
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateGuestJobDto {
  @IsIn(["same_day", "scheduled", "small_move", "big_move"])
  service_category!: "same_day" | "scheduled" | "small_move" | "big_move";

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  guest_name!: string;

  @IsString()
  @MinLength(9)
  @MaxLength(64)
  guest_phone!: string;

  @IsString()
  @MinLength(3)
  pickup_address!: string;

  @IsString()
  @MinLength(3)
  dropoff_address!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pickup_lat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pickup_lng?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropoff_lat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropoff_lng?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipient_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  recipient_phone?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  scheduled_at?: string | null;

  @IsOptional()
  @IsIn(["fixed_price", "quote_request"])
  pricing_model?: "fixed_price" | "quote_request";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offered_price?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mover_vehicle?: string | null;

  @IsOptional()
  @Allow()
  items?: unknown;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photo_paths?: string[] | null;

  @IsOptional()
  @IsBoolean()
  terms_accepted?: boolean;
}
