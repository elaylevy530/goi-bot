import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CapturePerJobDto } from "./dto/capture-per-job.dto";
import { UpdateBillingRecordDto } from "./dto/update-billing-record.dto";
import { PaymentsService } from "./payments.service";

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

  // Manual admin override only; real card payments are confirmed by the Tranzila notify.
  @Post("per-job/capture")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "manager")
  capturePerJob(@Body() dto: CapturePerJobDto) {
    return this.payments.capturePerJob(dto);
  }

  @Get("wallet/transactions")
  @UseGuards(JwtAuthGuard)
  walletTransactions(@CurrentUser() auth: AuthUserContext) {
    return this.payments.listWalletTransactions(auth.userId);
  }
}
