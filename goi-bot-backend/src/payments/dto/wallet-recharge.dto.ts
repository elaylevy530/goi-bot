import { Type } from "class-transformer";
import { IsNumber, Min } from "class-validator";

export class WalletRechargeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  amount!: number;
}
