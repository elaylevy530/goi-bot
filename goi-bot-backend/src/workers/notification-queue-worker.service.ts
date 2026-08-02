import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { GreenApiClient } from "../whatsapp/green-api.client";
import { NotificationQueueItem } from "./entities/notification-queue-item.entity";

export type DrainSummary = {
  ok: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

function backoffSeconds(attempt: number): number {
  // 30s, 2m, 8m, 32m, 2h
  return Math.min(60 * 60 * 2, 30 * Math.pow(4, attempt));
}

/**
 * Drain parity with TanStack
 * goi-bot-frontend/src/lib/whatsapp/notification-queue.server.ts.
 *
 * Sending currently only supports the Green API provider (GreenApiClient).
 * `template` messages fall back to plain text, matching the frontend's
 * Green-mode behavior (Cloud templates are not ported yet).
 */
@Injectable()
export class NotificationQueueWorkerService {
  constructor(
    @InjectRepository(NotificationQueueItem)
    private readonly queue: Repository<NotificationQueueItem>,
    private readonly greenApi: GreenApiClient,
  ) {}

  async drain(maxBatch = 50): Promise<DrainSummary> {
    const items = await this.queue.find({
      where: { status: "queued", next_attempt_at: LessThanOrEqual(new Date()) },
      order: { next_attempt_at: "ASC" },
      take: maxBatch,
    });

    if (items.length === 0) {
      return { ok: true, processed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const providerConfigured = this.greenApi.isConfigured();

    for (const item of items) {
      const claim = await this.queue
        .createQueryBuilder()
        .update(NotificationQueueItem)
        .set({ status: "sending" })
        .where("id = :id AND status = :status", { id: item.id, status: "queued" })
        .execute();
      if (!claim.affected) continue;

      if (!providerConfigured) {
        // Graceful skip — leave attempts untouched so it retries once
        // GREEN_API_INSTANCE_ID / GREEN_API_TOKEN are configured.
        await this.queue.update(item.id, {
          status: "queued",
          last_error: "GREEN_API credentials missing",
          next_attempt_at: new Date(Date.now() + 5 * 60 * 1000),
        });
        skipped++;
        continue;
      }

      try {
        const result = (await this.sendOne(item)) as
          | { idMessage?: unknown; skipped?: boolean; reason?: string }
          | undefined;

        if (result && typeof result === "object" && result.skipped) {
          await this.queue.update(item.id, {
            status: "queued",
            last_error: `skipped: ${result.reason ?? "unknown"}`,
            next_attempt_at: new Date(Date.now() + 5 * 60 * 1000),
          });
          skipped++;
          continue;
        }

        await this.queue.update(item.id, {
          status: "sent",
          sent_at: new Date(),
          provider: "green",
          external_message_id: result?.idMessage ? String(result.idMessage) : null,
        });
        sent++;
      } catch (e) {
        const attempts = (item.attempts ?? 0) + 1;
        const max = item.max_attempts ?? 5;
        const isDead = attempts >= max;
        await this.queue.update(item.id, {
          status: isDead ? "dead" : "queued",
          attempts,
          last_error: (e as Error).message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffSeconds(attempts) * 1000),
        });
        failed++;
      }
    }

    return { ok: true, processed: items.length, sent, failed, skipped };
  }

  private async sendOne(item: NotificationQueueItem): Promise<unknown> {
    const phone = item.recipient_phone;
    if (item.message_type === "text") {
      return this.greenApi.sendText(phone, item.body ?? "");
    }
    if (item.message_type === "buttons") {
      const buttons = (item.buttons as Array<{ buttonId: string; buttonText: string }>) ?? [];
      return this.greenApi.sendButtons(phone, item.body ?? "", buttons);
    }
    // template — Cloud-only upstream; Green mode falls back to text body.
    return this.greenApi.sendText(phone, item.body ?? item.template_name ?? "");
  }
}
