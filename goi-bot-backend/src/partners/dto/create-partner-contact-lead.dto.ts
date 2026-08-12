import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreatePartnerContactLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  /** Basic phone sanity — aligns with goi-partners client check. */
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[+\d\s\-()]+$/, {
    message: "phone must contain digits and optional + - ( ) spaces",
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string | null;
}
