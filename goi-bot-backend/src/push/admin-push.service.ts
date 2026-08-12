import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CourierPushSubscription } from "./entities/courier-push-subscription.entity";
import { WebPushService } from "./web-push.service";

@Injectable()
export class AdminPushService {
  private readonly logger = new Logger(AdminPushService.name);

  constructor(
    @InjectRepository(CourierPushSubscription)
    private readonly courierSubs: Repository<CourierPushSubscription>,
    private readonly webPush: WebPushService,
  ) {}

  async notifyCouriers(input: {
    courierIds: string[];
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  }): Promise<{ sent: number; expired: number; failed: number }> {
    const courierIds = [...new Set(input.courierIds || [])];
    if (!courierIds.length) return { sent: 0, expired: 0, failed: 0 };
    if (!this.webPush.isConfigured()) {
      this.logger.warn("admin push: VAPID missing");
      return { sent: 0, expired: 0, failed: 0 };
    }

    const subs = await this.courierSubs.find({
      where: { courier_id: In(courierIds) },
    });
    if (!subs.length) return { sent: 0, expired: 0, failed: 0 };

    const results = await this.webPush.sendPushBatch(subs, {
      title: input.title || "Goi",
      body: input.body || "",
      url: input.url || "/courier/new-jobs",
      tag: input.tag || `goi-admin-${Date.now()}`,
    });
    const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (gone.length) {
      await this.courierSubs.delete({ endpoint: In(gone) });
    }
    return {
      sent: results.filter((r) => r.ok).length,
      expired: gone.length,
      failed: results.filter((r) => !r.ok && !r.gone).length,
    };
  }
}
