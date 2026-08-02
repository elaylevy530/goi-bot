import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Job } from "../jobs/entities/job.entity";
import type { SetDispatchGroupsDto } from "./dto/set-dispatch-groups.dto";
import { WhatsappDispatchSettings } from "./entities/whatsapp-dispatch-settings.entity";
import { GreenApiClient } from "./green-api.client";

const DEFAULT_ROW: Omit<WhatsappDispatchSettings, "id"> = {
  couriers_group_id: null,
  couriers_group_name: null,
  movers_group_id: null,
  movers_group_name: null,
  updated_at: new Date(),
  updated_by: null,
};

function isMoveJob(job: Pick<Job, "service_category" | "job_type">): boolean {
  const service = String(job.service_category ?? "");
  if (service === "small_move" || service === "big_move") return true;
  return /הובל|פירוק|פינוי/.test(String(job.job_type ?? ""));
}

function buildNewJobGroupMessage(job: Job): string {
  const pickup = job.pickup_address || job.pickup_area || "—";
  const dropoff = job.dropoff_address || job.dropoff_area || "—";
  const payment = job.customer_price ?? job.payment ?? "—";
  const date = job.job_date || "—";
  const time = job.job_time || "—";
  const kind = job.job_type || job.service_category || "משלוח";
  const notes = job.description ? `הערות: ${job.description}\n` : "";
  return `🚀 עבודה חדשה ב-Goi!
סוג: ${kind}
איסוף: ${pickup} → מסירה: ${dropoff}
תאריך: ${date} שעה: ${time}
תשלום: ${payment} ₪
${notes}מס׳ הזמנה: ${job.job_number}
רוצה לקחת? פתח באפליקציה.`;
}

@Injectable()
export class WhatsappDispatchService {
  private readonly logger = new Logger(WhatsappDispatchService.name);

  constructor(
    @InjectRepository(WhatsappDispatchSettings)
    private readonly settings: Repository<WhatsappDispatchSettings>,
    private readonly green: GreenApiClient,
  ) {}

  async get() {
    const row = await this.settings.findOne({ where: { id: true } });
    return (
      row ?? {
        id: true,
        ...DEFAULT_ROW,
      }
    );
  }

  async set(dto: SetDispatchGroupsDto, userId: string) {
    await this.settings.save({
      id: true,
      couriers_group_id: dto.couriers_group_id || null,
      couriers_group_name: dto.couriers_group_name || null,
      movers_group_id: dto.movers_group_id || null,
      movers_group_name: dto.movers_group_name || null,
      updated_at: new Date(),
      updated_by: userId,
    });
    return { ok: true as const };
  }

  /**
   * Best-effort WhatsApp group broadcast after dispatch.
   * Never throws — missing config / send failures are logged and skipped.
   */
  async notifyJobDispatched(job: Job): Promise<{ ok: boolean; skipped?: string }> {
    if (!this.green.isConfigured()) {
      this.logger.warn(`notifyJobDispatched ${job.id}: Green API not configured — skip`);
      return { ok: false, skipped: "green_api_missing" };
    }

    const row = await this.get();
    const groupId = isMoveJob(job) ? row.movers_group_id : row.couriers_group_id;
    if (!groupId) {
      this.logger.warn(
        `notifyJobDispatched ${job.id}: no WhatsApp dispatch group configured — skip`,
      );
      return { ok: false, skipped: "group_missing" };
    }

    try {
      await this.green.sendGroupText(groupId, buildNewJobGroupMessage(job));
      return { ok: true };
    } catch (e) {
      this.logger.error(
        `notifyJobDispatched ${job.id} failed`,
        e instanceof Error ? e.stack : e,
      );
      return { ok: false, skipped: "send_failed" };
    }
  }
}
