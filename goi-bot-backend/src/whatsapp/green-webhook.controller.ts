import { Body, Controller, Get, HttpCode, Logger, Post } from "@nestjs/common";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

/**
 * Green API inbound webhook. Same path as TanStack:
 * `/api/public/green-webhook`.
 *
 * Configure in Green API console → Settings:
 *   webhookUrl: https://<host>/api/public/green-webhook
 *   incomingWebhook: yes
 */
@Controller("api/public/green-webhook")
export class GreenWebhookController {
  private readonly logger = new Logger(GreenWebhookController.name);

  constructor(private readonly webhook: WhatsappWebhookService) {}

  @Get()
  info() {
    return { ok: true, info: "Green API webhook live" };
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() rawBody: Record<string, unknown>): Promise<string> {
    if (!rawBody || typeof rawBody !== "object") {
      return "ok";
    }

    let eventId: string | null = null;
    try {
      const result = await this.webhook.logInbound(rawBody);
      if (result.duplicate) return "ok-duplicate";
      eventId = result.eventId;
    } catch (e) {
      this.logger.error("green-webhook.log failed", e instanceof Error ? e.stack : e);
    }

    try {
      await this.webhook.handleInboundMessage(rawBody);
      if (eventId) await this.webhook.markCompleted(eventId);
    } catch (err) {
      this.logger.error("green-webhook.handler failed", err instanceof Error ? err.stack : err);
      if (eventId) {
        await this.webhook
          .markFailed(eventId, err instanceof Error ? err.message : String(err))
          .catch(() => {});
      }
    }

    return "ok";
  }
}
