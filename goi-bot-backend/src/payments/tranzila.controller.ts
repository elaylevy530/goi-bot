import { Body, Controller, ForbiddenException, Header, HttpCode, Param, Post } from "@nestjs/common";
import { TranzilaCheckoutDto } from "./dto/tranzila-checkout.dto";
import { type TranzilaNotifyBody, TranzilaPaymentsService } from "./tranzila-payments.service";

/** Public routes: guests authenticate with job_id + tracking_token; Tranzila calls notify. */
@Controller("api/payments/tranzila")
export class TranzilaController {
  constructor(private readonly tranzila: TranzilaPaymentsService) {}

  @Post("checkout")
  @Header("Cache-Control", "no-store")
  checkout(@Body() dto: TranzilaCheckoutDto) {
    return this.tranzila.createCheckout(dto);
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
