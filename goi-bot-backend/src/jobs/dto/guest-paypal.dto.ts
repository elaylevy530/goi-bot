import { Type } from "class-transformer";
import { IsNumber, IsString, Min, MinLength } from "class-validator";
import { GuestJobRefDto } from "./guest-job-ref.dto";

export class GuestPaypalOrderDto extends GuestJobRefDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class GuestPaypalCaptureDto extends GuestJobRefDto {
  @IsString()
  @MinLength(4)
  order_id!: string;
}
