import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { UpdateCustomerSelfDto } from "./update-customer-self.dto";

/** Admin may patch everything a customer can, plus account/billing fields. */
export class UpdateCustomerAdminDto extends UpdateCustomerSelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  customer_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  billing_cycle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  business_niche?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  business_tax_id?: string | null;

  @IsOptional()
  @IsBoolean()
  invoice_required?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp_opt_in?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  whatsapp_provider?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
