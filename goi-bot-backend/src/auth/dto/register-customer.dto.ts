import { IsString, MaxLength, MinLength } from "class-validator";

export class RegisterCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  full_name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;
}
