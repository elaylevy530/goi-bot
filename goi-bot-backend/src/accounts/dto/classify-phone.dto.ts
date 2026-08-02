import { IsString, MaxLength, MinLength } from "class-validator";

export class ClassifyPhoneDto {
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;
}
