import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { TranzilaCheckoutDto } from "./dto/tranzila-checkout.dto";
import { WalletRechargeDto } from "./dto/wallet-recharge.dto";
import { type TranzilaNotifyBody, TranzilaPaymentsService } from "./tranzila-payments.service";

@Controller("api/payments/tranzila")
export class TranzilaController {
  constructor(private readonly tranzila: TranzilaPaymentsService) {}

  @Post("checkout")
  @Header("Cache-Control", "no-store")
  checkout(@Body() dto: TranzilaCheckoutDto) {
    return this.tranzila.createCheckout(dto);
  }

  @Get("wallet/method")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  savedMethod(@CurrentUser() auth: AuthUserContext) {
    return this.tranzila.getSavedMethod(auth.userId);
  }

  @Delete("wallet/method")
  @UseGuards(JwtAuthGuard)
  deleteMethod(@CurrentUser() auth: AuthUserContext) {
    return this.tranzila.deleteSavedMethod(auth.userId);
  }

  @Post("wallet/recharge")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  walletRecharge(@CurrentUser() auth: AuthUserContext, @Body() dto: WalletRechargeDto) {
    return this.tranzila.startWalletRecharge(auth.userId, dto.amount);
  }

  @Post("wallet/save-card")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  saveCard(@CurrentUser() auth: AuthUserContext) {
    return this.tranzila.startSaveCard(auth.userId);
  }

  @Get("wallet/intents/:id")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  intentStatus(@CurrentUser() auth: AuthUserContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.tranzila.walletIntentStatus(auth.userId, id);
  }

  @Post("notify/:secret")
  @HttpCode(200)
  @Header("Content-Type", "text/plain")
  async notify(@Param("secret") secret: string, @Body() body: TranzilaNotifyBody) {
    if (!this.tranzila.verifyNotifySecret(secret)) throw new ForbiddenException();
    await this.tranzila.handleNotify(body ?? {});
    return "OK";
  }
}
