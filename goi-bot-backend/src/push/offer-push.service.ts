import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type { Job } from "../jobs/entities/job.entity";
import { CourierPushSubscription } from "./entities/courier-push-subscription.entity";
import { WebPushService } from "./web-push.service";
import type { PushPayload } from "./web-push.service";

/**
 * Fan-out Web Push to courier subscriptions when a job is dispatched.
 * Fail-soft: missing VAPID / send errors never block dispatch visibility.
 */
@Injectable()
export class OfferPushService {
  private readonly logger = new Logger(OfferPushService.name);

  constructor(
    @InjectRepository(CourierPushSubscription)
    private readonly courierSubs: Repository<CourierPushSubscription>,
    private readonly webPush: WebPushService,
  ) {}

  async notifyCouriers(
    job: Job,
    courierIds: string[],
  ): Promise<{ sent: number; failed: number; skipped?: string }> {
    if (!courierIds.length) {
      return { sent: 0, failed: 0, skipped: "no_couriers" };
    }
    if (!this.webPush.isConfigured()) {
      this.logger.warn(`offer push ${job.id}: VAPID missing — skip`);
      return { sent: 0, failed: 0, skipped: "vapid_missing" };
    }

    const subs = await this.courierSubs.find({
      where: { courier_id: In(courierIds) },
    });
    if (!subs.length) {
      return { sent: 0, failed: 0, skipped: "no_subscriptions" };
    }

    const pickup = job.pickup_address || job.pickup_area || "";
    const dropoff = job.dropoff_address || job.dropoff_area || "";
    const route =
      pickup || dropoff
        ? `${pickup || "—"}${dropoff ? ` → ${dropoff}` : ""}`
        : "משלוח חדש זמין";

    try {
      const results = await this.webPush.sendPushBatch(subs, {
        title: "עבודה חדשה ב-Goi",
        body: route,
        url: `/courier/new-jobs?jobId=${encodeURIComponent(job.id)}`,
        tag: `goi-offer-${job.id}`,
      });
      const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
      if (gone.length) {
        await this.courierSubs.delete({ endpoint: In(gone) });
      }
      const sent = results.filter((r) => r.ok).length;
      const failed = results.length - sent;
      return { sent, failed };
    } catch (e) {
      this.logger.error(
        `offer push ${job.id} failed`,
        e instanceof Error ? e.stack : e,
      );
      return { sent: 0, failed: subs.length, skipped: "send_failed" };
    }
  }

  async notifyCourier(
    courierId: string,
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number; skipped?: string }> {
    if (!this.webPush.isConfigured()) {
      return { sent: 0, failed: 0, skipped: "vapid_missing" };
    }
    const subs = await this.courierSubs.find({ where: { courier_id: courierId } });
    if (!subs.length) {
      return { sent: 0, failed: 0, skipped: "no_subscriptions" };
    }
    try {
      const results = await this.webPush.sendPushBatch(subs, payload);
      const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
      if (gone.length) {
        await this.courierSubs.delete({ endpoint: In(gone) });
      }
      const sent = results.filter((r) => r.ok).length;
      return { sent, failed: results.length - sent };
    } catch (e) {
      this.logger.error(
        `courier push ${courierId} failed`,
        e instanceof Error ? e.stack : e,
      );
      return { sent: 0, failed: subs.length, skipped: "send_failed" };
    }
  }
}
