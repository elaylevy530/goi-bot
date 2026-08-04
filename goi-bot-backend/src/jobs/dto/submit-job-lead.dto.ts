import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SubmitJobLeadDto {
  @IsIn(["take", "quote"])
  kind!: "take" | "quote";

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  full_name!: string;

  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  price?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string | null;
}
