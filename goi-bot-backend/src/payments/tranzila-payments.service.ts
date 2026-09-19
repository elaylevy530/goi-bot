import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { timingSafeEqual } from "crypto";
import { isUUID } from "class-validator";
import { Repository } from "typeorm";
import { AppError } from "../common/errors/app.error";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { SavedPaymentMethod } from "./entities/saved-payment-method.entity";
import { WalletChargeIntent } from "./entities/wallet-charge-intent.entity";
import { PaymentsService } from "./payments.service";
import { TranzilaClient } from "./tranzila.client";
import { verifyTranzilaResponseHash } from "./tranzila-response-hash";
import { walletBonus } from "./wallet-bonus";
import type { TranzilaCheckoutDto } from "./dto/tranzila-checkout.dto";

const HANDSHAKE_TTL_MS = 20 * 60 * 1000;
const RESPONSE_OK = new Set(["000", "0"]);
const SAVE_CARD_SUM = 1;
const UNIQUE_VIOLATION = "23505";

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

@Injectable()
export class TranzilaPaymentsService {
  private readonly logger = new Logger(TranzilaPaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tranzila: TranzilaClient,
    private readonly payments: PaymentsService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(BillingRecord) private readonly billing: Repository<BillingRecord>,
    @InjectRepository(SavedPaymentMethod) private readonly cards: Repository<SavedPaymentMethod>,
    @InjectRepository(WalletChargeIntent) private readonly intents: Repository<WalletChargeIntent>,
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
      iframe_url: this.tranzila.buildIframeUrl({
        thtk,
        sum: amount,
        extra: { goi_job: job.id },
      }),
      amount,
      currency: "ILS",
      expires_at: new Date(Date.now() + HANDSHAKE_TTL_MS).toISOString(),
    };
  }

  async getSavedMethod(userId: string) {
    const businessId = await this.payments.requireBusinessOwner(userId);
    const row = await this.cards.findOne({ where: { business_id: businessId } });
    if (!row) return { saved: false as const };
    return {
      saved: true as const,
      last4: row.last4,
      exp_month: row.exp_month,
      exp_year: row.exp_year,
    };
  }

  async deleteSavedMethod(userId: string) {
    const businessId = await this.payments.requireBusinessOwner(userId);
    await this.cards.delete({ business_id: businessId });
    return { ok: true as const };
  }

  async walletIntentStatus(userId: string, intentId: string) {
    const businessId = await this.payments.requireBusinessOwner(userId);
    const intent = await this.intents.findOne({ where: { id: intentId, business_id: businessId } });
    if (!intent) throw new AppError("not_found", { userMessage: "העסקה לא נמצאה" });
    return { paid: intent.status === "paid", kind: intent.kind, amount: Number(intent.amount) };
  }

  /** Charge saved token, or return an iframe checkout. Amount is server-computed (bonus too). */
  async startWalletRecharge(userId: string, amountRaw: number) {
    const businessId = await this.payments.requireBusinessOwner(userId);
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 50) {
      throw new AppError("bad_request", { userMessage: "סכום מינימלי לטעינה: ₪50" });
    }
    const { pct, bonusVal } = walletBonus(amount);
    const card = await this.cards.findOne({ where: { business_id: businessId } });
    if (card) {
      const { transactionId } = await this.tranzila.chargeToken({
        amount,
        token: card.token,
        expireMonth: Number(card.exp_month),
        expireYear: Number(card.exp_year.length === 2 ? `20${card.exp_year}` : card.exp_year),
      });
      await this.payments.creditPrepaidRecharge(businessId, {
        amount,
        bonusVal,
        pct,
        processorId: transactionId,
      });
      return { paid: true as const };
    }
    return this.openWalletIframe(businessId, "recharge", amount, bonusVal, pct);
  }

  async startSaveCard(userId: string) {
    const businessId = await this.payments.requireBusinessOwner(userId);
    return this.openWalletIframe(businessId, "save_card", SAVE_CARD_SUM, 0, 0);
  }

  private async openWalletIframe(
    businessId: string,
    kind: "recharge" | "save_card",
    amount: number,
    bonusVal: number,
    pct: number,
  ) {
    const intent = await this.intents.save(
      this.intents.create({
        business_id: businessId,
        kind,
        amount: String(amount),
        bonus_val: String(bonusVal),
        pct: String(pct),
        status: "pending",
      }),
    );
    const terminal = this.tranzila.tokenTerminalName();
    const thtk = await this.tranzila.createHandshake(
      amount,
      { goi_wallet: intent.id, kind },
      terminal,
    );
    return {
      paid: false as const,
      intent_id: intent.id,
      iframe_url: this.tranzila.buildIframeUrl({
        thtk,
        sum: amount,
        terminalName: terminal,
        tokenize: true,
        tranmode: "AK",
        extra: { goi_wallet: intent.id },
      }),
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

  /** Server-to-server confirmation. Idempotent. */
  async handleNotify(body: TranzilaNotifyBody): Promise<void> {
    const secret = this.config.get<string>("tranzila.secretKey");
    if (!secret || !verifyTranzilaResponseHash(body, secret)) {
      this.logger.warn("tranzila notify rejected: invalid or missing response_hash");
      return;
    }

    if (!RESPONSE_OK.has(field(body, "Response", "response"))) return;

    const transactionId = field(body, "ConfirmationCode", "transaction_id", "index", "Tempref");
    const walletId = field(body, "goi_wallet");
    if (isUUID(walletId) && transactionId) {
      await this.handleWalletNotify(walletId, transactionId, body);
      return;
    }

    const jobId = field(body, "goi_job", "job_id");
    if (isUUID(jobId) && transactionId) await this.handleJobNotify(jobId, transactionId, body);
  }

  private async handleWalletNotify(intentId: string, transactionId: string, body: TranzilaNotifyBody) {
    const intent = await this.intents.findOne({ where: { id: intentId } });
    if (!intent) return;
    if (intent.status === "paid") {
      await this.upsertSavedCard(intent.business_id, body);
      return;
    }

    const expected = Number(intent.amount);
    const paid = Number(field(body, "sum"));
    if (!(expected > 0) || !Number.isFinite(paid) || toCents(paid) !== toCents(expected)) {
      this.logger.warn(`tranzila notify amount mismatch for wallet ${intentId}`);
      return;
    }

    intent.status = "paid";
    intent.tranzila_transaction_id = transactionId;
    try {
      await this.intents.save(intent);
    } catch (e) {
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) return;
      throw e;
    }

    await this.payments.creditPrepaidRecharge(intent.business_id, {
      amount: expected,
      bonusVal: Number(intent.bonus_val),
      pct: Number(intent.pct),
      processorId: transactionId,
    });
    await this.upsertSavedCard(intent.business_id, body);
  }

  private async upsertSavedCard(businessId: string, body: TranzilaNotifyBody) {
    const token = field(body, "TranzilaTK", "tranzila_tk", "token");
    if (!token || token.length < 8) return;
    const last4 = lastFour(body);
    const exp_month = pad2(field(body, "expmonth", "expiry_month", "expire_month"));
    const exp_year = field(body, "expyear", "expiry_year", "expire_year").slice(-4);
    if (!last4 || !exp_month || !exp_year) return;

    let row = await this.cards.findOne({ where: { business_id: businessId } });
    row ??= this.cards.create({ business_id: businessId });
    row.token = token;
    row.last4 = last4;
    row.exp_month = exp_month;
    row.exp_year = exp_year;
    row.brand = field(body, "card_type_name", "cardtype") || null;
    await this.cards.save(row);
  }

  private async handleJobNotify(jobId: string, transactionId: string, body: TranzilaNotifyBody) {
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
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) return;
      throw e;
    }

    job.per_job_paid = true;
    await this.jobs.save(job);
  }
}

function lastFour(body: TranzilaNotifyBody): string {
  const explicit = field(body, "last_4_digits", "credit_card_last_4_digits");
  if (/^\d{4}$/.test(explicit)) return explicit;
  const mask = field(body, "card_mask", "ccno");
  const digits = mask.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}

function pad2(v: string): string {
  const n = v.replace(/\D/g, "");
  if (!n) return "";
  return n.padStart(2, "0").slice(-2);
}
