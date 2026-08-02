import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CourierPasswordResetRequestDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;
}

export class CourierPasswordResetConfirmDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
