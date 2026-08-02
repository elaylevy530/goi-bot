import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class EnsureCustomerDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;
}
