import { IsString, MaxLength, MinLength } from "class-validator";

/** JWT-authenticated self-service update (no current-password check). */
export class UpdatePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword!: string;
}
