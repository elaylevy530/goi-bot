import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  /** Accepts product synthetic emails (`*@*.goi.local`) as well as real ones. */
  @IsEmail({ require_tld: false })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
