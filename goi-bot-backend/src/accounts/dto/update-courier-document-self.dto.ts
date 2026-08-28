import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

/** Fields a courier may set on one of their documents. `verified` is admin-only. */
export class UpdateCourierDocumentSelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  file_url?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @ValidateIf((_, v) => v != null)
  @IsDateString()
  expires_at?: string | null;
}
