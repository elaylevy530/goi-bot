import { IsBoolean, IsOptional } from "class-validator";

export class ApproveCourierDto {
  /** When true, approve but keep the courier paused until a manager flips them on. */
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;
}
