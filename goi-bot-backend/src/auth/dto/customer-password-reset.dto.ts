import { IsString, MaxLength, MinLength } from "class-validator";

export class CustomerPasswordResetRequestDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;
}

export class CustomerPasswordResetConfirmDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
