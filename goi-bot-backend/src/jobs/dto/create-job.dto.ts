import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

/** Coerce numeric inputs without turning null/empty into 0. */
function OptionalNumber() {
  return Transform(({ value }) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  });
}

export class CreateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  job_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  job_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pricing_type?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_name?: string | null;

  @IsOptional()
  @IsString()
  pickup_address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  pickup_area?: string | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  pickup_lat?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  pickup_lng?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickup_contact_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pickup_contact_phone?: string | null;

  @IsOptional()
  @IsString()
  pickup_instructions?: string | null;

  @IsOptional()
  @IsString()
  pickup_notes?: string | null;

  @IsOptional()
  @IsBoolean()
  pickup_ready?: boolean;

  @IsOptional()
  @IsString()
  pickup_ready_at?: string | null;

  @IsOptional()
  @IsString()
  dropoff_address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dropoff_area?: string | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  dropoff_lat?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  dropoff_lng?: number | null;

  @IsOptional()
  @IsString()
  dropoff_notes?: string | null;

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

  /** Frontend may send number; stored as numeric string. */
  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  payment?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  customer_price?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  suggested_courier_payment?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  estimated_distance_km?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  package_type?: string | null;

  @IsOptional()
  @IsBoolean()
  fragile?: boolean;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  number_of_packages?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vehicle_required?: string | null;

  @IsOptional()
  @IsString()
  job_date?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  job_time?: string | null;

  /** Not a DB column — persisted inside pricing_snapshot. */
  @IsOptional()
  @IsString()
  delivery_deadline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  matching_model?: string | null;

  /** Not a DB column — persisted inside pricing_snapshot. */
  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  base_price?: number | null;

  /** Not a DB column — persisted inside pricing_snapshot. */
  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  price_per_km?: number | null;

  @IsOptional()
  @IsBoolean()
  invoice_required?: boolean;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  couriers_needed?: number | null;

  @IsOptional()
  @OptionalNumber()
  @IsNumber()
  matching_couriers_count?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  guest_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  guest_phone?: string | null;
}
