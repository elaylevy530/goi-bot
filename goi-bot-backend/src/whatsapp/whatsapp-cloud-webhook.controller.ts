import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { normalizeCloudWebhookToGreen, verifyCloudSignature } from "./cloud-webhook.util";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

/**
 * Meta WhatsApp Cloud API webhook. Same path as TanStack:
 * `/api/public/whatsapp-cloud-webhook`.
 *
 * GET  — verification handshake (hub.mode=subscribe).
 * POST — inbound messages; normalized to the Green-API shape so a single
 *        downstream handler (WhatsappWebhookService) understands both.
 */
@Controller("api/public/whatsapp-cloud-webhook")
export class WhatsappCloudWebhookController {
  private readonly logger = new Logger(WhatsappCloudWebhookController.name);

  constructor(
    private readonly webhook: WhatsappWebhookService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  verify(
    @Query("hub.mode") mode?: string,
    @Query("hub.verify_token") token?: string,
    @Query("hub.challenge") challenge?: string,
  ) {
    const expected = this.config.get<string>("whatsappCloud.verifyToken");
    if (mode === "subscribe" && expected && token === expected && challenge) {
      return challenge;
    }
    return { ok: true, info: "WhatsApp Cloud webhook live" };
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers("x-hub-signature-256") signature?: string,
  ): Promise<string> {
    const raw = req.rawBody?.toString("utf8") ?? JSON.stringify(body ?? {});
    const appSecret = this.config.get<string>("whatsappCloud.appSecret");

    if (!verifyCloudSignature(raw, signature, appSecret)) {
      throw new UnauthorizedException("invalid signature");
    }

    let normalized: Array<Record<string, unknown>> = [];
    try {
      normalized = normalizeCloudWebhookToGreen(body);
    } catch (e) {
      this.logger.error("whatsapp-cloud.parse failed", e instanceof Error ? e.stack : e);
      return "ok";
    }

    for (const evt of normalized) {
      let eventId: string | null = null;
      try {
        const result = await this.webhook.logInbound(evt);
        if (result.duplicate) continue;
        eventId = result.eventId;
      } catch (e) {
        this.logger.error("whatsapp-cloud.log failed", e instanceof Error ? e.stack : e);
      }

      try {
        await this.webhook.handleInboundMessage(evt);
        if (eventId) await this.webhook.markCompleted(eventId);
      } catch (err) {
        this.logger.error("whatsapp-cloud.handler failed", err instanceof Error ? err.stack : err);
        if (eventId) {
          await this.webhook
            .markFailed(eventId, err instanceof Error ? err.message : String(err))
            .catch(() => {});
        }
      }
    }

    return "ok";
  }
}
