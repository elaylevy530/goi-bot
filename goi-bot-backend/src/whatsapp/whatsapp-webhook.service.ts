import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GreenApiWebhookEvent } from "./entities/green-webhook-event.entity";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";

type MessageData = Record<string, any>;
type SenderData = Record<string, any>;

/**
 * Persists inbound WhatsApp webhook traffic (Green API + normalized Cloud API
 * events share the same shape) and acks quickly.
 *
 * Full bot state-machine logic (ensureCustomerAccount, offer flows, button
 * routing) lives in goi-bot-frontend/src/lib/green-webhook-handler.server.ts
 * and is intentionally NOT ported here yet — it is large and depends on many
 * other domains (jobs, dispatch, pricing) that haven't moved to Nest.
 * `handleInboundMessage` is the seam where that logic will land; for now it
 * only logs so the webhook always acks 200 without losing the message.
 */
@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    @InjectRepository(GreenApiWebhookEvent)
    private readonly events: Repository<GreenApiWebhookEvent>,
    @InjectRepository(WhatsappMessage)
    private readonly messages: Repository<WhatsappMessage>,
  ) {}

  private extractButtonId(md: MessageData): string | null {
    return (
      md.buttonsResponseMessage?.selectedButtonId ??
      md.templateButtonReplyMessage?.selectedId ??
      md.interactiveButtonsReplyMessage?.selectedButtonId ??
      md.interactiveButtonsResponseMessage?.selectedButtonId ??
      md.interactiveButtonsResponse?.selectedButtonId ??
      md.interactiveButtonsResponse?.selectedId ??
      md.interactiveResponseMessage?.selectedButtonId ??
      md.interactiveButtons?.selectedButtonId ??
      md.quickReplyButtonsResponseMessage?.selectedButtonId ??
      md.listResponseMessage?.singleSelectReply?.selectedRowId ??
      null
    );
  }

  private extractButtonText(md: MessageData): string | null {
    return (
      md.buttonsResponseMessage?.selectedButtonText ??
      md.templateButtonReplyMessage?.selectedDisplayText ??
      md.interactiveButtonsReplyMessage?.selectedButtonText ??
      md.interactiveButtonsResponseMessage?.selectedButtonText ??
      md.interactiveButtonsResponse?.selectedButtonText ??
      md.interactiveButtonsResponse?.selectedDisplayText ??
      md.interactiveResponseMessage?.selectedButtonText ??
      md.quickReplyButtonsResponseMessage?.selectedButtonText ??
      md.listResponseMessage?.singleSelectReply?.title ??
      md.textMessageData?.textMessage ??
      md.extendedTextMessageData?.text ??
      null
    );
  }

  private extractSenderPhone(sd: SenderData): string | null {
    const chatId = sd.chatId ?? sd.sender ?? null;
    const match = typeof chatId === "string" ? chatId.match(/^(\d+)@/) : null;
    return match ? match[1] : null;
  }

  /**
   * Idempotency check + log the raw event. Returns the saved event id, or
   * `duplicate: true` when this externalId was already logged.
   */
  async logInbound(
    rawBody: Record<string, unknown>,
  ): Promise<{ eventId: string | null; duplicate: boolean; senderPhone: string | null }> {
    const md = (rawBody.messageData ?? {}) as MessageData;
    const sd = (rawBody.senderData ?? {}) as SenderData;
    const externalId = (rawBody.idMessage as string) || null;
    const senderPhone = this.extractSenderPhone(sd);

    if (externalId) {
      const existing = await this.events.findOne({ where: { external_message_id: externalId } });
      if (existing) {
        return { eventId: existing.id, duplicate: true, senderPhone };
      }
    }

    const buttonId = this.extractButtonId(md);
    const buttonText = this.extractButtonText(md);
    const chatId = sd.chatId ?? sd.sender ?? null;

    const saved = await this.events.save(
      this.events.create({
        external_message_id: externalId,
        type_webhook: (rawBody.typeWebhook as string) ?? null,
        type_message: (md.typeMessage as string) ?? null,
        sender_chat_id: chatId,
        sender_phone: senderPhone,
        button_id: buttonId,
        button_text: buttonText,
        raw_payload: rawBody,
        processing_status: "received",
      }),
    );

    if (senderPhone && rawBody.typeWebhook === "incomingMessageReceived") {
      await this.messages.save(
        this.messages.create({
          phone: senderPhone,
          body: buttonText ?? "",
          direction: "inbound",
          delivery_status: "received",
          message_type: (md.typeMessage as string) ?? null,
          external_message_id: externalId,
        }),
      );
    }

    return { eventId: saved.id, duplicate: false, senderPhone };
  }

  async markCompleted(eventId: string): Promise<void> {
    await this.events.update(eventId, {
      processing_status: "completed",
      processed_at: new Date(),
    });
  }

  async markFailed(eventId: string, message: string): Promise<void> {
    await this.events.update(eventId, {
      processing_status: "failed",
      processing_error: message.slice(0, 2000),
      processed_at: new Date(),
    });
  }

  /**
   * TODO(phase2): route to the full bot state machine once JobsModule /
   * dispatch / pricing are ported. The inbound message is already persisted
   * by `logInbound` — this is a safe no-op ack in the meantime.
   */
  async handleInboundMessage(_rawBody: Record<string, unknown>): Promise<void> {
    this.logger.debug("handleInboundMessage: stored only, bot flow not yet ported");
  }
}
