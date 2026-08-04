import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpsertPartnerDto {
  @IsOptional()
  @IsUUID()
  id?: string | null;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be lowercase kebab-case (a-z, 0-9, hyphen)",
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contact_phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  whatsapp_group_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  dispatch_note?: string | null;

  @IsBoolean()
  is_active!: boolean;

  @IsOptional()
  @IsObject()
  message_sections?: Record<string, boolean> | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message_cta?: string | null;
}
