import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { IsNumber, IsOptional, Min } from "class-validator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CapturePerJobDto } from "./dto/capture-per-job.dto";
import { UpdateBillingRecordDto } from "./dto/update-billing-record.dto";
import { PaymentsService } from "./payments.service";

class WalletRechargeDto {
  @IsNumber() @Min(50) amount!: number;
  @IsOptional() @IsNumber() bonusVal?: number;
  @IsOptional() @IsNumber() pct?: number;
}

@Controller("api/payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("billing-records/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  getBillingRecord(@Param("id", ParseUUIDPipe) id: string) {
    return this.payments.getBillingRecord(id);
  }

  @Patch("billing-records/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  updateBillingRecord(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillingRecordDto,
  ) {
    return this.payments.updateBillingRecord(id, dto);
  }

  @Post("per-job/capture")
  @UseGuards(JwtAuthGuard)
  capturePerJob(@Body() dto: CapturePerJobDto) {
    return this.payments.capturePerJob(dto);
  }

  @Get("wallet/transactions")
  @UseGuards(JwtAuthGuard)
  walletTransactions(@CurrentUser() auth: AuthUserContext) {
    return this.payments.listWalletTransactions(auth.userId);
  }

  @Post("wallet/recharge")
  @UseGuards(JwtAuthGuard)
  walletRecharge(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: WalletRechargeDto,
  ) {
    return this.payments.rechargeWallet(auth.userId, dto);
  }
}
