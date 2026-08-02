import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, ValidateNested } from "class-validator";
import { GuestJobRefDto } from "./guest-job-ref.dto";

export class GuestJobsListDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GuestJobRefDto)
  refs!: GuestJobRefDto[];
}
