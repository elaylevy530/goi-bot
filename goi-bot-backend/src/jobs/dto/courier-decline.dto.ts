import { IsNumber, IsOptional, IsUUID } from "class-validator";

export class CourierDeclineDto {
  @IsUUID()
  job_id!: string;

  @IsOptional()
  @IsNumber()
  declined_price?: number | null;
}
