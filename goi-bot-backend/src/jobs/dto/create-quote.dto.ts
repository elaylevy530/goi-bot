import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export class CreateQuoteDto {
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  includes_invoice?: boolean;

  @IsOptional()
  @IsBoolean()
  is_final_price?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimated_arrival_minutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimated_delivery_minutes?: number;

  /** Admin-only override when submitting on behalf of a courier. */
  @IsOptional()
  @IsUUID()
  courier_id?: string;
}
