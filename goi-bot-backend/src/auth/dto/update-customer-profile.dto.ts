import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  full_name!: string;
}
