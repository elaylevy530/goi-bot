import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { GreenApiClient } from "./green-api.client";
import { WhatsappMessage } from "./entities/whatsapp-message.entity";

@Injectable()
export class AdminWhatsappService {
  private readonly logger = new Logger(AdminWhatsappService.name);

  constructor(
    private readonly green: GreenApiClient,
    @InjectRepository(WhatsappMessage)
    private readonly messages: Repository<WhatsappMessage>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
  ) {}

  async sendMessage(input: {
    phone: string;
    message: string;
    courier_id?: string | null;
    job_id?: string | null;
    sent_by?: string | null;
    /** When true, only persist a WhatsApp log row (manual deeplink mark-sent). */
    log_only?: boolean;
  }) {
    const phone = String(input.phone || "").trim();
    const body = String(input.message || "").trim();
    const row = this.messages.create({
      phone,
      body,
      direction: "outbound",
      delivery_status: "queued",
      courier_id: input.courier_id ?? null,
      job_id: input.job_id ?? null,
      sent_by: input.sent_by ?? null,
      message_type: input.log_only ? "manual_mark" : "admin_send",
    });

    if (input.log_only || !this.green.isConfigured()) {
      row.delivery_status = "sent";
      row.sent_at = new Date();
      if (!input.log_only && !this.green.isConfigured()) {
        row.error_text = "Green API not configured — logged only";
      }
      return this.messages.save(row);
    }

    try {
      const result = await this.green.sendText(phone, body);
      row.delivery_status = "sent";
      row.sent_at = new Date();
      const id =
        result && typeof result === "object" && "idMessage" in result
          ? String((result as { idMessage?: unknown }).idMessage ?? "")
          : "";
      if (id) row.external_message_id = id;
      return this.messages.save(row);
    } catch (e) {
      row.delivery_status = "failed";
      row.failed_at = new Date();
      row.error_text = e instanceof Error ? e.message : String(e);
      await this.messages.save(row);
      this.logger.error(`admin send failed to ${phone}`, e instanceof Error ? e.stack : e);
      throw e;
    }
  }

  async broadcastApprovalPending(sentBy: string, message?: string) {
    const pending = await this.couriers.find({
      where: { courier_status: "פעיל", admin_jobs_blocked: true },
      select: ["id", "full_name", "whatsapp_phone"],
      take: 500,
    });
    const text =
      message?.trim() ||
      "שלום! הפרופיל שלך ב-Goi ממתין לאישור סופי. נעדכן אותך ברגע שתוכל לקבל עבודות.";

    let sent = 0;
    let failed = 0;
    for (const c of pending) {
      if (!c.whatsapp_phone) {
        failed += 1;
        continue;
      }
      try {
        await this.sendMessage({
          phone: c.whatsapp_phone,
          message: text,
          courier_id: c.id,
          sent_by: sentBy,
          log_only: !this.green.isConfigured(),
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    return { ok: true as const, total: pending.length, sent, failed };
  }
}
