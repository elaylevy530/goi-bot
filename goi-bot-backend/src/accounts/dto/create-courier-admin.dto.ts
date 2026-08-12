import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/** Admin manual courier create (row only; provision login separately). */
export class CreateCourierAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  full_name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(64)
  whatsapp_phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  base_city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vehicle_type?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  invoice_status?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  courier_experience_duration?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  courier_status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lead_source?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsIn(["individual", "mover"])
  courier_kind?: string;
}
