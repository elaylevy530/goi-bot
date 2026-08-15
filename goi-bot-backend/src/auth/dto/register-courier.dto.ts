import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/** Public courier/mover join registration (Nest JWT identity, Postgres row). */
export class RegisterCourierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  full_name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  whatsapp_phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  id_number?: string | null;

  /** Optional — live GPS location is preferred over a typed base city. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  base_city?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wanted_work_areas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_work_area?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pickup_areas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_pickup_area?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dropoff_areas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_dropoff_area?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  work_distance_from_base?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicle_types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  job_types?: string[];

  @IsOptional()
  @IsIn(["כן", "לא", "תסדרו אותי"])
  invoice_status?: "כן" | "לא" | "תסדרו אותי" | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  courier_experience_status?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  courier_experience_duration?: string | null;

  @IsOptional()
  @IsBoolean()
  consent_whatsapp?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password?: string | null;

  @IsOptional()
  @IsIn(["courier", "mover"])
  courier_kind?: "courier" | "mover";

  @IsOptional()
  @IsString()
  @MaxLength(10_000_000)
  id_photo_base64?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  id_photo_mime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10_000_000)
  id_photo_back_base64?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  id_photo_back_mime?: string | null;
}
