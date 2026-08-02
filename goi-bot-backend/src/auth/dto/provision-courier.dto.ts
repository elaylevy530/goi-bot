import { IsUUID } from "class-validator";

export class ProvisionCourierDto {
  @IsUUID()
  id!: string;
}
