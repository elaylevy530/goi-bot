import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

class MunchCartItemDto {
  @IsString()
  product_id!: string;

  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  image_url?: string | null;
}

export class CreateMunchOrderDto {
  @IsUUID()
  kiosk_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MunchCartItemDto)
  items!: MunchCartItemDto[];

  @IsString()
  dropoff_address!: string;

  @IsOptional()
  @IsNumber()
  dropoff_lat?: number | null;

  @IsOptional()
  @IsNumber()
  dropoff_lng?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
