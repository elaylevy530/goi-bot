import { IsUUID } from "class-validator";

export class CourierDeclineDto {
  @IsUUID()
  job_id!: string;
}
