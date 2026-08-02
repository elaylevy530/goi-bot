import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { PaypalWebhookService } from "./paypal-webhook.service";

/**
 * PayPal webhook receiver. Same path as TanStack: `/api/public/paypal-webhook`.
 * Public endpoint (auth bypass) — security is the signature check performed
 * in PaypalWebhookService via PaypalClientService.
 */
@Controller("api/public/paypal-webhook")
export class PaypalWebhookController {
  constructor(private readonly service: PaypalWebhookService) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers("paypal-auth-algo") authAlgo: string | undefined,
    @Headers("paypal-cert-url") certUrl: string | undefined,
    @Headers("paypal-transmission-id") transmissionId: string | undefined,
    @Headers("paypal-transmission-sig") transmissionSig: string | undefined,
    @Headers("paypal-transmission-time") transmissionTime: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    const result = await this.service.handle(rawBody, {
      "paypal-auth-algo": authAlgo,
      "paypal-cert-url": certUrl,
      "paypal-transmission-id": transmissionId,
      "paypal-transmission-sig": transmissionSig,
      "paypal-transmission-time": transmissionTime,
    });
    res.status(result.status);
    return result.body;
  }
}
