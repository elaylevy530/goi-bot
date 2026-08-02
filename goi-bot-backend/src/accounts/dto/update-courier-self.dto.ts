import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/** Fields a courier may edit on their own profile. */
export class UpdateCourierSelfDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatar_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  base_city?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  working_areas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pickup_areas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dropoff_areas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_work_area?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_pickup_area?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  custom_dropoff_area?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  work_distance_from_base?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vehicle_type?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicle_types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availability?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_job_types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  job_types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typical_hours?: string[];

  @IsOptional()
  @IsBoolean()
  accepting_jobs?: boolean;

  @IsOptional()
  @IsBoolean()
  location_sharing_enabled?: boolean;

  @IsOptional()
  @IsNumber()
  last_lat?: number | null;

  @IsOptional()
  @IsNumber()
  last_lng?: number | null;

  @IsOptional()
  @IsBoolean()
  whatsapp_opt_in?: boolean;

  @IsOptional()
  @IsBoolean()
  consent_whatsapp?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  bank_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  bank_account?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  bank_branch?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_account_owner?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  id_number?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  id_photo_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  id_photo_back_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  courier_experience_status?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  courier_experience_duration?: string | null;
}
