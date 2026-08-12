import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { PartnersModule } from "../partners/partners.module";
import { AdminWhatsappController } from "./admin-whatsapp.controller";
import { AdminWhatsappService } from "./admin-whatsapp.service";
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
      Courier,
    ]),
    PartnersModule,
  ],
  controllers: [
    GreenWebhookController,
    WhatsappCloudWebhookController,
    WhatsappDispatchController,
    AdminWhatsappController,
  ],
  providers: [
    WhatsappWebhookService,
    GreenApiClient,
    WhatsappDispatchService,
    AdminWhatsappService,
  ],
  exports: [GreenApiClient, WhatsappDispatchService],
})
export class WhatsappModule {}
