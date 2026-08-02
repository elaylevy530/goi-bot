import {
  Equals,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

const NICHES = [
  "manual_dispatch",
  "local_business",
  "restaurant",
  "online_store",
  "pharmacy_clinic",
  "integration_business",
] as const;

const SERVICE_TYPES = ["couriers", "moving", "mixed"] as const;

export class RegisterBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  full_name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  business_name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsEmail({ require_tld: false })
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsIn(NICHES)
  business_niche?: (typeof NICHES)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  business_category!: string;

  @IsIn(SERVICE_TYPES)
  service_type!: (typeof SERVICE_TYPES)[number];

  @Equals(true)
  terms_accepted!: true;
}
