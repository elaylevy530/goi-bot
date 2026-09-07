import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsUUID } from "class-validator";

export class CourierDeclineDto {
  @IsUUID()
  job_id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  declined_price?: number | null;
}
