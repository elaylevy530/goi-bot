import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { timingSafeEqual } from "crypto";
import { isUUID } from "class-validator";
import { Repository } from "typeorm";
import { AppError } from "../common/errors/app.error";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { TranzilaClient } from "./tranzila.client";
import { verifyTranzilaResponseHash } from "./tranzila-response-hash";
import type { TranzilaCheckoutDto } from "./dto/tranzila-checkout.dto";

const HANDSHAKE_TTL_MS = 20 * 60 * 1000;
const RESPONSE_OK = new Set(["000", "0"]);

export type TranzilaNotifyBody = Record<string, unknown>;

function field(body: TranzilaNotifyBody, ...keys: string[]): string {
  for (const key of keys) {
    const v = body[key];
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

const toCents = (n: number) => Math.round(n * 100);
const UNIQUE_VIOLATION = "23505";

@Injectable()
export class TranzilaPaymentsService {
  private readonly logger = new Logger(TranzilaPaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tranzila: TranzilaClient,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(BillingRecord) private readonly billing: Repository<BillingRecord>,
  ) {}

  private amountDue(job: Job): number {
    const snap = (job.pricing_snapshot ?? {}) as Record<string, unknown>;
    return Number(snap.amount_to_charge_now ?? 0);
  }

  /** Creates a handshake + iframe URL for a guest job. The client never chooses the amount. */
  async createCheckout(dto: TranzilaCheckoutDto) {
    const job = await this.jobs.findOne({ where: { id: dto.job_id } });
    if (!job || job.recipient_tracking_token !== dto.tracking_token) {
      throw new AppError("not_found", { userMessage: "ההזמנה לא נמצאה" });
    }
    if (job.per_job_paid) return { paid: true as const };

    const amount = this.amountDue(job);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("bad_request", { userMessage: "אין סכום לחיוב בהזמנה זו" });
    }

    const thtk = await this.tranzila.createHandshake(amount, { job_id: job.id });
    return {
      paid: false as const,
      iframe_url: this.tranzila.buildIframeUrl({ thtk, sum: amount, jobId: job.id }),
      amount,
      currency: "ILS",
      expires_at: new Date(Date.now() + HANDSHAKE_TTL_MS).toISOString(),
    };
  }

  /** Path secret is compared in constant time; the notify URL is configured only in my.tranzila.com. */
  verifyNotifySecret(provided: string): boolean {
    const expected = this.config.get<string>("tranzila.notifySecret");
    if (!expected) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Server-to-server confirmation. Idempotent; marks the job paid only on matching amount + job. */
  async handleNotify(body: TranzilaNotifyBody): Promise<void> {
    const secret = this.config.get<string>("tranzila.secretKey");
    if (!secret || !verifyTranzilaResponseHash(body, secret)) {
      this.logger.warn("tranzila notify rejected: invalid or missing response_hash");
      return;
    }

    if (!RESPONSE_OK.has(field(body, "Response", "response"))) return;

    // goi_job is the iframe param; job_id is echoed from handshake request_params.
    const jobId = field(body, "goi_job", "job_id");
    // Processor id: ConfirmationCode / transaction_id; falls back to index, then Tempref.
    const transactionId = field(body, "ConfirmationCode", "transaction_id", "index", "Tempref");
    if (!isUUID(jobId) || !transactionId) return;

    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) return;

    const expected = this.amountDue(job);
    const paid = Number(field(body, "sum"));
    if (!(expected > 0) || !Number.isFinite(paid) || toCents(paid) !== toCents(expected)) {
      this.logger.warn(`tranzila notify amount mismatch for job ${jobId}`);
      return;
    }

    let rec = await this.billing.findOne({ where: { job_id: job.id } });
    if (rec?.status === "captured" && job.per_job_paid) return;

    const customerPrice = Number(job.customer_price ?? 0);
    const courierPay = Number(job.suggested_courier_payment ?? 0);
    rec ??= this.billing.create({ job_id: job.id, business_id: job.customer_id });
    Object.assign(rec, {
      provider: "tranzila",
      status: "captured",
      billing_status: "paid",
      customer_price: String(customerPrice),
      courier_payment: String(courierPay),
      platform_fee: String(Math.max(0, customerPrice - courierPay)),
      tranzila_transaction_id: transactionId,
      tranzila_index: field(body, "index") || null,
    });
    try {
      await this.billing.save(rec);
    } catch (e) {
      // Duplicate notify for an already-recorded transaction: treat as processed.
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) return;
      throw e;
    }

    job.per_job_paid = true;
    await this.jobs.save(job);
  }
}
