import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Fields a business/customer may edit on their own profile. */
export class UpdateCustomerSelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  business_tax_id?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsObject()
  niche_details?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  business_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  business_category?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  city?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  delivery_cities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  service_areas?: string[] | null;

  @IsOptional()
  @IsString()
  pickup_address?: string | null;

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
  @IsBoolean()
  pickup_watchdog_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  pickup_reminder_minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pickup_redispatch_minutes?: number;

  @IsOptional()
  @IsBoolean()
  favorites_first_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  favorites_fallback_minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  delivery_minutes?: number;

  @IsOptional()
  @IsBoolean()
  notify_wa?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_recipient_allowed?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_recipient_enabled?: boolean;

  @IsOptional()
  @IsIn(["standard", "private", "business"])
  account_mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  logo_url?: string | null;

  @IsOptional()
  @IsBoolean()
  payment_method_on_file?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  payment_method_last4?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payment_method_brand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payment_provider?: string | null;

  @IsOptional()
  @IsString()
  dispatch_blocked_reason?: string | null;

  @IsOptional()
  @IsIn(["distance_based", "fixed_price", "city_radius"])
  default_pricing_type?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  default_delivery_price?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  signed_agreement_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  signed_agreement_version?: string | null;
}
