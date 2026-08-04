import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class RepriceJobDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  price!: number;
}

export class GuestRepriceJobDto extends RepriceJobDto {
  @IsString()
  @MinLength(16)
  tracking_token!: string;

  @IsOptional()
  @IsString()
  job_id?: string;
}
