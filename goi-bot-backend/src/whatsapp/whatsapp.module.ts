import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PartnersModule } from "../partners/partners.module";
import { GreenApiWebhookEvent } from "./entities/green-webhook-event.entity";
import { WaBotState } from "./entities/wa-bot-state.entity";
import { WhatsappDispatchSettings } from "./entities/whatsapp-dispatch-settings.entity";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";
import { GreenApiClient } from "./green-api.client";
import { GreenWebhookController } from "./green-webhook.controller";
import { WhatsappCloudWebhookController } from "./whatsapp-cloud-webhook.controller";
import { WhatsappDispatchController } from "./whatsapp-dispatch.controller";
import { WhatsappDispatchService } from "./whatsapp-dispatch.service";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

/**
 * Phase 2: Nest owns the public webhook URLs and persists inbound traffic.
 * The full bot state machine (green-webhook-handler.server.ts) is not
 * ported — see WhatsappWebhookService.handleInboundMessage.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GreenApiWebhookEvent,
      WhatsappMessage,
      WaBotState,
      WhatsappDispatchSettings,
    ]),
    PartnersModule,
  ],
  controllers: [
    GreenWebhookController,
    WhatsappCloudWebhookController,
    WhatsappDispatchController,
  ],
  providers: [WhatsappWebhookService, GreenApiClient, WhatsappDispatchService],
  exports: [GreenApiClient, WhatsappDispatchService],
})
export class WhatsappModule {}
