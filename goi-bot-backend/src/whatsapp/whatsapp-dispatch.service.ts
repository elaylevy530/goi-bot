import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { Job } from "../jobs/entities/job.entity";
import type { Partner } from "../partners/entities/partner.entity";
import { PartnersService } from "../partners/partners.service";
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

type PartnerDispatchContext = Pick<
  Partner,
  "whatsapp_group_id" | "dispatch_note" | "message_cta"
>;

function isMoveJob(job: Pick<Job, "service_category" | "job_type">): boolean {
  const service = String(job.service_category ?? "");
  if (service === "small_move" || service === "big_move") return true;
  return /הובל|פירוק|פינוי/.test(String(job.job_type ?? ""));
}

function buildNewJobGroupMessage(
  job: Job,
  partner?: PartnerDispatchContext | null,
): string {
  const pickup = job.pickup_address || job.pickup_area || "—";
  const dropoff = job.dropoff_address || job.dropoff_area || "—";
  const isQuote = job.pricing_type === "quote_request";
  const payment = isQuote
    ? "פתוח להצעות"
    : `${job.customer_price ?? job.payment ?? "—"} ₪`;
  const date = job.job_date || "—";
  const time = job.job_time || "—";
  const kind = job.job_type || job.service_category || "משלוח";
  const notes = job.description ? `הערות: ${job.description}\n` : "";
  const cta =
    partner?.message_cta?.trim() ||
    (isQuote
      ? "רוצה להגיש הצעת מחיר? הלקוח בוחר מבין ההצעות"
      : "רוצה לקחת את העבודה או להציע מחיר?");
  const partnerNote = partner?.dispatch_note?.trim();
  const partnerBlock = partnerNote ? `\n${partnerNote}` : "";
  const publicBase = (process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || "")
    .replace(/\/$/, "");
  const link = job.short_code
    ? `\n👉 ${publicBase ? `${publicBase}/g/${job.short_code}` : `/g/${job.short_code}`}`
    : "";
  return `🚀 עבודה חדשה ב-Goi!
סוג: ${kind}
איסוף: ${pickup} → מסירה: ${dropoff}
תאריך: ${date} שעה: ${time}
תשלום: ${payment}
${notes}מס׳ הזמנה: ${job.job_number}
${cta}${link}${partnerBlock}`;
}

@Injectable()
export class WhatsappDispatchService {
  private readonly logger = new Logger(WhatsappDispatchService.name);

  constructor(
    @InjectRepository(WhatsappDispatchSettings)
    private readonly settings: Repository<WhatsappDispatchSettings>,
    private readonly green: GreenApiClient,
    private readonly partners: PartnersService,
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
   * Partner jobs prefer the partner WhatsApp group when configured.
   * Never throws — missing config / send failures are logged and skipped.
   */
  async notifyJobDispatched(job: Job): Promise<{ ok: boolean; skipped?: string }> {
    if (!this.green.isConfigured()) {
      this.logger.warn(`notifyJobDispatched ${job.id}: Green API not configured — skip`);
      return { ok: false, skipped: "green_api_missing" };
    }

    let partner: PartnerDispatchContext | null = null;
    if (job.partner_id) {
      const row = await this.partners.findById(job.partner_id);
      if (row) {
        partner = {
          whatsapp_group_id: row.whatsapp_group_id,
          dispatch_note: row.dispatch_note,
          message_cta: row.message_cta,
        };
      }
    }

    const settings = await this.get();
    const defaultGroupId = isMoveJob(job)
      ? settings.movers_group_id
      : settings.couriers_group_id;
    const groupId = partner?.whatsapp_group_id || defaultGroupId;
    if (!groupId) {
      this.logger.warn(
        `notifyJobDispatched ${job.id}: no WhatsApp dispatch group configured — skip`,
      );
      return { ok: false, skipped: "group_missing" };
    }

    try {
      await this.green.sendGroupText(groupId, buildNewJobGroupMessage(job, partner));
      return { ok: true };
    } catch (e) {
      this.logger.error(
        `notifyJobDispatched ${job.id} failed`,
        e instanceof Error ? e.stack : e,
      );
      return { ok: false, skipped: "send_failed" };
    }
  }

  /**
   * Best-effort WhatsApp group notice after a courier claims/accepts a job.
   * Never throws — missing config / send failures are logged and skipped.
   */
  async notifyJobTaken(
    job: Job,
    courierName: string,
  ): Promise<{ ok: boolean; skipped?: string }> {
    if (!this.green.isConfigured()) {
      return { ok: false, skipped: "green_api_missing" };
    }
    const settings = await this.get();
    const groupId = isMoveJob(job)
      ? settings.movers_group_id
      : settings.couriers_group_id;
    if (!groupId) {
      return { ok: false, skipped: "group_missing" };
    }
    const pickup = job.pickup_address || job.pickup_area || "—";
    const dropoff = job.dropoff_address || job.dropoff_area || "—";
    const msg = `✅ עבודה נלקחה ב-Goi!
מס׳: ${job.job_number}
שליח: ${courierName || "—"}
איסוף: ${pickup} → מסירה: ${dropoff}`;
    try {
      await this.green.sendGroupText(groupId, msg);
      return { ok: true };
    } catch (e) {
      this.logger.error(
        `notifyJobTaken ${job.id} failed`,
        e instanceof Error ? e.stack : e,
      );
      return { ok: false, skipped: "send_failed" };
    }
  }
}
