import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from "class-validator";
import { normalizeOfferRadiusStored } from "../../common/offer-radius";
import { UpdateCourierSelfDto } from "./update-courier-self.dto";

/** Admin/manager may patch everything a courier can, plus operational fields. */
export class UpdateCourierAdminDto extends UpdateCourierSelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  courier_status?: string;

  @IsOptional()
  @IsIn(["courier", "individual", "mover"])
  courier_kind?: string;

  @IsOptional()
  @IsBoolean()
  is_paused?: boolean;

  @IsOptional()
  @IsBoolean()
  admin_jobs_blocked?: boolean;

  @IsOptional()
  @IsBoolean()
  bank_details_verified?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_concurrent_jobs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  consecutive_declines?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  auto_pause_after_declines?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  whatsapp_provider?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lead_source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  invoice_status?: string | null;

  /** GPS offer radius in km. Couriers cannot change this from the app. */
  @IsOptional()
  @Transform(({ value }) => normalizeOfferRadiusStored(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(8)
  work_distance_from_base?: string | null;
}
