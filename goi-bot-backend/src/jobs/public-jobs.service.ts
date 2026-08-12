import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { In, Repository } from "typeorm";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { Message } from "../chat/entities/message.entity";
import { AppError } from "../common/errors/app.error";
import { PartnersService } from "../partners/partners.service";
import { PaypalClientService } from "../payments/paypal-client.service";
import { PlatformService } from "../platform/platform.service";
import { Conversation } from "../push/entities/conversation.entity";
import { GreenApiClient } from "../whatsapp/green-api.client";
import { WhatsappDispatchService } from "../whatsapp/whatsapp-dispatch.service";
import type { CreateGuestJobDto } from "./dto/create-guest-job.dto";
import type {
  GuestChatListDto,
  GuestChatMarkReadDto,
  GuestChatOpenDto,
  GuestChatPostMessageDto,
} from "./dto/guest-chat.dto";
import type { GuestJobRefDto, GuestSelectQuoteDto } from "./dto/guest-job-ref.dto";
import type { GuestPaypalCaptureDto, GuestPaypalOrderDto } from "./dto/guest-paypal.dto";
import type { GuestRepriceJobDto } from "./dto/reprice-job.dto";
import type { SubmitJobLeadDto } from "./dto/submit-job-lead.dto";
import { ExpressPricingRule } from "./entities/express-pricing-rule.entity";
import { Job } from "./entities/job.entity";
import { JobLead } from "./entities/job-lead.entity";
import { JobQuote } from "./entities/job-quote.entity";
import { generateJobShortCode } from "./job-short-code";
import { JobsService } from "./jobs.service";

const TERMINAL = new Set(["הושלמה", "בוטלה"]);
const OFFER_TTL_MS = 30 * 60 * 1000;

function generateTrackingToken(): string {
  return randomBytes(16).toString("hex");
}

function generateJobNumber(): string {
  return `GOI-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizePaymentMode(mode: string | null | undefined): string {
  if (!mode) return "cash_only";
  if (mode === "full" || mode === "full_upfront") return "full_upfront";
  if (mode === "deposit") return "deposit";
  if (mode === "cash_only" || mode === "cash") return "cash_only";
  return mode;
}

@Injectable()
export class PublicJobsService {
  private readonly logger = new Logger(PublicJobsService.name);

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(JobQuote) private readonly quotes: Repository<JobQuote>,
    @InjectRepository(JobLead) private readonly leads: Repository<JobLead>,
    @InjectRepository(ExpressPricingRule)
    private readonly expressRules: Repository<ExpressPricingRule>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(CourierStats)
    private readonly courierStats: Repository<CourierStats>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly jobsService: JobsService,
    private readonly paypal: PaypalClientService,
    private readonly partners: PartnersService,
    private readonly platform: PlatformService,
    private readonly greenApi: GreenApiClient,
    private readonly whatsappDispatch: WhatsappDispatchService,
  ) {}

  private isUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  private async findByPublicRef(ref: string): Promise<Job | null> {
    const key = ref.trim();
    if (!key || key.length < 4 || key.length > 60) return null;
    if (this.isUuid(key)) {
      return this.jobs.findOne({ where: { id: key } });
    }
    return this.jobs.findOne({ where: { short_code: key.toLowerCase() } });
  }

  private async isJobTakenForLeads(job: Job): Promise<boolean> {
    if (job.selected_courier_id) return true;
    if (job.pricing_type === "quote_request") return false;
    const count = await this.leads.count({
      where: { job_id: job.id, kind: "take" },
    });
    return count > 0;
  }

  private async ensureShortCode(job: Job): Promise<string> {
    if (job.short_code) return job.short_code;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateJobShortCode();
      const exists = await this.jobs.exist({ where: { short_code: code } });
      if (exists) continue;
      job.short_code = code;
      await this.jobs.save(job);
      return code;
    }
    throw new AppError("internal", { userMessage: "Failed to allocate short_code" });
  }

  private async requireGuestJob(jobId: string, trackingToken: string): Promise<Job> {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job || job.recipient_tracking_token !== trackingToken) {
      throw new AppError("not_found", { userMessage: "ההזמנה לא נמצאה" });
    }
    return job;
  }

  async create(dto: CreateGuestJobDto) {
    const rule = await this.expressRules.findOne({
      where: { service_category: dto.service_category },
    });
    if (!rule) {
      throw new AppError("not_found", {
        userMessage: "כלל תמחור לא נמצא עבור סוג השירות",
      });
    }

    const pricingModel = dto.pricing_model ?? "fixed_price";
    if (pricingModel === "fixed_price" && !rule.allow_customer_fixed_price) {
      throw new AppError("bad_request", {
        userMessage: "לא ניתן לבחור מחיר קבוע עבור שירות זה",
      });
    }
    if (pricingModel === "quote_request" && !rule.allow_customer_quote) {
      throw new AppError("bad_request", {
        userMessage: "לא ניתן לבקש הצעות מחיר עבור שירות זה",
      });
    }

    let distanceKm: number | null = null;
    if (
      dto.pickup_lat != null &&
      dto.pickup_lng != null &&
      dto.dropoff_lat != null &&
      dto.dropoff_lng != null
    ) {
      distanceKm = haversineKm(
        dto.pickup_lat,
        dto.pickup_lng,
        dto.dropoff_lat,
        dto.dropoff_lng,
      );
    }

    const base = Number(rule.base_price ?? 0);
    const perKm = Number(rule.price_per_km ?? 0);
    const minPrice = Number(rule.min_price ?? 0);
    const rulePrice = Math.max(
      minPrice,
      base + (distanceKm != null ? distanceKm * perKm : 0),
    );

    let totalPrice: number | null = null;
    if (pricingModel === "fixed_price") {
      totalPrice =
        dto.offered_price != null && dto.offered_price > 0
          ? Number(dto.offered_price)
          : rulePrice;
    }

    const paymentMode = normalizePaymentMode(rule.payment_mode);
    const depositPercent = Number(rule.deposit_percent ?? 0);
    let amountToChargeNow = 0;
    if (totalPrice != null && totalPrice > 0) {
      if (paymentMode === "full_upfront") amountToChargeNow = totalPrice;
      else if (paymentMode === "deposit") {
        amountToChargeNow = Math.round((totalPrice * depositPercent) / 100);
      }
    }

    let jobDate: string | null = null;
    let jobTime: string | null = null;
    if (dto.scheduled_at) {
      const d = new Date(dto.scheduled_at);
      if (!Number.isNaN(d.getTime())) {
        jobDate = d.toISOString().slice(0, 10);
        jobTime = d.toISOString().slice(11, 16);
      }
    }

    const trackingToken = generateTrackingToken();
    const snapshot: Record<string, unknown> = {
      service_category: dto.service_category,
      service_display_name: rule.display_name,
      payment_mode: paymentMode,
      deposit_percent: depositPercent,
      amount_to_charge_now: amountToChargeNow,
      total_price: totalPrice,
      pricing_model: pricingModel,
      items: dto.items ?? null,
      photo_paths: dto.photo_paths ?? null,
      mover_vehicle: dto.mover_vehicle ?? null,
      rule_id: rule.id,
      base_price: base,
      price_per_km: perKm,
      min_price: minPrice,
    };

    // Partner deep-link attribution — skip unknown/inactive slugs (do not fail create).
    let partnerId: string | null = null;
    const partnerSlug = dto.partner_slug?.trim();
    if (partnerSlug) {
      const partner = await this.partners.findActiveBySlug(partnerSlug);
      if (partner) {
        partnerId = partner.id;
      } else {
        this.logger.warn(
          `guest create: partner_slug="${partnerSlug}" not found or inactive — skipping attribution`,
        );
      }
    }

    let shortCode = generateJobShortCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await this.jobs.exist({ where: { short_code: shortCode } });
      if (!exists) break;
      shortCode = generateJobShortCode();
    }

    const job = await this.jobs.save(
      this.jobs.create({
        job_number: generateJobNumber(),
        short_code: shortCode,
        recipient_tracking_token: trackingToken,
        status: "טיוטה",
        job_type:
          dto.service_category === "small_move" || dto.service_category === "big_move"
            ? "הובלה"
            : "משלוח",
        service_category: dto.service_category,
        pricing_type: pricingModel,
        matching_model: pricingModel === "quote_request" ? "quote_request" : "fastest",
        guest_name: dto.guest_name,
        guest_phone: dto.guest_phone,
        pickup_address: dto.pickup_address,
        pickup_lat: dto.pickup_lat ?? null,
        pickup_lng: dto.pickup_lng ?? null,
        dropoff_address: dto.dropoff_address,
        dropoff_lat: dto.dropoff_lat ?? null,
        dropoff_lng: dto.dropoff_lng ?? null,
        recipient_name: dto.recipient_name ?? dto.guest_name,
        recipient_phone: dto.recipient_phone ?? dto.guest_phone,
        description: dto.description ?? null,
        vehicle_required: dto.mover_vehicle ?? null,
        customer_price: totalPrice != null ? String(totalPrice) : null,
        payment: totalPrice != null ? String(totalPrice) : "0",
        suggested_courier_payment:
          pricingModel === "fixed_price" && totalPrice != null
            ? String(totalPrice)
            : null,
        estimated_distance_km:
          distanceKm != null ? distanceKm.toFixed(2) : null,
        distance_km: distanceKm != null ? distanceKm.toFixed(2) : null,
        job_date: jobDate,
        job_time: jobTime,
        pricing_snapshot: snapshot,
        partner_id: partnerId,
        quote_deadline_at:
          pricingModel === "quote_request"
            ? new Date(Date.now() + OFFER_TTL_MS)
            : null,
      }),
    );

    return {
      job_id: job.id,
      tracking_token: trackingToken,
      job_number: job.job_number,
      payment_mode: paymentMode,
      total_price: totalPrice ?? 0,
      amount_to_charge_now: amountToChargeNow,
      service_display_name: rule.display_name,
    };
  }

  async confirm(ref: GuestJobRefDto) {
    const job = await this.requireGuestJob(ref.job_id, ref.tracking_token);
    if (TERMINAL.has(job.status)) {
      throw new AppError("conflict", { userMessage: "לא ניתן לשדר הזמנה זו" });
    }
    if (job.selected_courier_id) {
      return { ok: true as const, already_assigned: true };
    }

    const result = await this.jobsService.dispatchJob(job.id);
    return {
      ok: true as const,
      dispatched: result.dispatched,
      sent: result.sent,
      status: "נשלחה לשליחים",
    };
  }

  async status(ref: GuestJobRefDto) {
    const job = await this.requireGuestJob(ref.job_id, ref.tracking_token);
    let courier: { full_name: string } | null = null;
    if (job.selected_courier_id) {
      const c = await this.couriers.findOne({
        where: { id: job.selected_courier_id },
        select: ["full_name"],
      });
      if (c) courier = { full_name: c.full_name };
    }
    return {
      found: Boolean(job.selected_courier_id),
      courier,
      matching_couriers_count: job.matching_couriers_count ?? 0,
    };
  }

  async detail(ref: GuestJobRefDto) {
    const job = await this.requireGuestJob(ref.job_id, ref.tracking_token);
    const snap = (job.pricing_snapshot ?? {}) as Record<string, unknown>;
    const paymentMode = normalizePaymentMode(
      (snap.payment_mode as string) ?? "cash_only",
    );
    const depositPercent = Number(snap.deposit_percent ?? 0);
    const total = Number(job.customer_price ?? snap.total_price ?? 0);
    const prepaid = job.per_job_paid
      ? total
      : Number(snap.amount_to_charge_now ?? 0);

    let courier: Record<string, unknown> | null = null;
    if (job.selected_courier_id) {
      const c = await this.couriers.findOne({
        where: { id: job.selected_courier_id },
      });
      if (c) {
        const stats = await this.courierStats.findOne({
          where: { courier_id: c.id },
        });
        courier = {
          avatar_url: c.avatar_url,
          full_name: c.full_name,
          courier_kind: c.courier_kind,
          avg_rating: stats?.avg_rating != null ? Number(stats.avg_rating) : null,
          vehicle_label: c.vehicle_label,
          vehicle_type: c.vehicle_type,
          base_city: c.base_city,
          jobs_completed: stats?.jobs_completed ?? null,
          on_time_rate:
            stats?.on_time_rate != null ? Number(stats.on_time_rate) : null,
          member_since: c.created_at?.toISOString?.() ?? c.created_at,
          bio: null,
          whatsapp_phone: c.whatsapp_phone,
        };
      }
    }

    return {
      job: {
        ...job,
        service_category: job.service_category ?? snap.service_category ?? null,
      },
      courier,
      payment: {
        total,
        payment_mode: paymentMode,
        deposit_percent: depositPercent,
        prepaid,
        remaining: Math.max(0, total - prepaid),
      },
    };
  }

  async list(refs: GuestJobRefDto[]) {
    if (refs.length === 0) return [];
    const jobs = await this.jobs.find({
      where: { id: In(refs.map((r) => r.job_id)) },
      order: { created_at: "DESC" },
    });
    const tokenById = new Map(refs.map((r) => [r.job_id, r.tracking_token]));
    const matched = jobs.filter(
      (j) => j.recipient_tracking_token === tokenById.get(j.id),
    );
    const quoteCounts = matched.length
      ? await this.quotes
          .createQueryBuilder("q")
          .select("q.job_id", "job_id")
          .addSelect("COUNT(*)", "cnt")
          .where("q.job_id IN (:...ids)", { ids: matched.map((j) => j.id) })
          .groupBy("q.job_id")
          .getRawMany<{ job_id: string; cnt: string }>()
      : [];
    const countMap = new Map(quoteCounts.map((r) => [r.job_id, Number(r.cnt)]));

    return matched.map((j) => ({
      id: j.id,
      job_number: j.job_number,
      status: j.status,
      service_category: j.service_category,
      pickup_address: j.pickup_address,
      dropoff_address: j.dropoff_address,
      customer_price: j.customer_price != null ? Number(j.customer_price) : null,
      created_at: j.created_at,
      recipient_tracking_token: j.recipient_tracking_token,
      description: j.description,
      job_date: j.job_date,
      job_time: j.job_time,
      pricing_type: j.pricing_type,
      selected_courier_id: j.selected_courier_id,
      selected_quote_id: j.selected_quote_id,
      quotes_count: countMap.get(j.id) ?? 0,
    }));
  }

  async cancel(ref: GuestJobRefDto) {
    const job = await this.requireGuestJob(ref.job_id, ref.tracking_token);
    if (TERMINAL.has(job.status)) {
      throw new AppError("conflict", { userMessage: "ההזמנה כבר הסתיימה" });
    }
    if (job.selected_courier_id) {
      throw new AppError("conflict", {
        userMessage: "לא ניתן לבטל לאחר ששובץ שליח",
      });
    }
    job.status = "בוטלה";
    await this.jobs.save(job);
    await this.jobsService.cancelPendingOffersForJob(job.id);
    return { ok: true as const, status: "בוטלה" };
  }

  async listQuotes(ref: GuestJobRefDto) {
    const job = await this.requireGuestJob(ref.job_id, ref.tracking_token);
    const rows = await this.quotes.find({
      where: { job_id: job.id },
      order: { created_at: "DESC" },
      take: 50,
    });
    if (rows.length === 0) return { quotes: [] };

    const courierIds = [...new Set(rows.map((q) => q.courier_id))];
    const couriers = await this.couriers.find({ where: { id: In(courierIds) } });
    const stats = await this.courierStats.find({
      where: { courier_id: In(courierIds) },
    });
    const courierMap = new Map(couriers.map((c) => [c.id, c]));
    const statsMap = new Map(stats.map((s) => [s.courier_id, s]));

    const quotes = rows.map((q) => {
      const c = courierMap.get(q.courier_id);
      const s = statsMap.get(q.courier_id);
      return {
        id: q.id,
        price: Number(q.price),
        eta_minutes: q.estimated_arrival_minutes,
        note: q.note,
        courier_id: q.courier_id,
        courier_name: c?.full_name ?? "מוביל",
        courier_image: c?.avatar_url ?? null,
        vehicle_type: c?.vehicle_label || c?.vehicle_type || null,
        rating: s?.avg_rating != null ? Number(s.avg_rating) : 0,
        completed_jobs: s?.jobs_completed ?? 0,
        created_at: q.created_at,
        status: q.status,
      };
    });

    return { quotes };
  }

  async selectQuote(jobId: string, quoteId: string, ref: GuestSelectQuoteDto) {
    if (ref.job_id !== jobId || ref.quote_id !== quoteId) {
      throw new AppError("bad_request", { userMessage: "מזהה הצעה לא תואם" });
    }
    const job = await this.requireGuestJob(jobId, ref.tracking_token);
    if (job.selected_quote_id || job.selected_courier_id) {
      throw new AppError("conflict", { userMessage: "כבר נבחרה הצעה להזמנה זו" });
    }
    if (TERMINAL.has(job.status)) {
      throw new AppError("conflict", { userMessage: "ההזמנה אינה פתוחה לבחירה" });
    }

    const quote = await this.quotes.findOne({
      where: { id: quoteId, job_id: jobId },
    });
    if (!quote) {
      throw new AppError("not_found", { userMessage: "ההצעה לא נמצאה" });
    }

    quote.status = "selected";
    quote.selected_at = new Date();
    await this.quotes.save(quote);

    job.selected_quote_id = quote.id;
    job.selected_courier_id = quote.courier_id;
    job.status = "נבחר שליח";
    job.courier_step = "שליח אישר";
    job.delivery_status = job.delivery_status ?? "assigned";
    job.accepted_at = new Date();
    job.customer_price = String(quote.price);
    job.payment = String(quote.price);
    await this.jobs.save(job);

    await this.quotes
      .createQueryBuilder()
      .update(JobQuote)
      .set({ status: "rejected" })
      .where("job_id = :jobId AND id != :quoteId AND status = :pending", {
        jobId,
        quoteId,
        pending: "pending",
      })
      .execute();

    await this.jobsService.cancelPendingOffersForJob(jobId);

    return { ok: true as const, job_id: jobId, quote_id: quoteId };
  }

  private requirePaypalConfigured() {
    if (!this.paypal.isConfigured()) {
      throw new AppError("config_missing", {
        userMessage: "תשלום PayPal אינו מוגדר בשרת (חסר PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)",
      });
    }
  }

  private guestChargeAmount(job: Job): number {
    const snap = (job.pricing_snapshot ?? {}) as Record<string, unknown>;
    const fromSnap = Number(snap.amount_to_charge_now ?? 0);
    if (fromSnap > 0) return fromSnap;
    const fromJob = Number(job.per_job_amount ?? 0);
    if (fromJob > 0) return fromJob;
    return 0;
  }

  /**
   * Create a real PayPal checkout order for a guest job.
   * Returns `{ order_id }` for the PayPal JS SDK — never invents an id.
   */
  async paypalOrder(dto: GuestPaypalOrderDto) {
    this.requirePaypalConfigured();
    const job = await this.requireGuestJob(dto.job_id, dto.tracking_token);

    if (job.per_job_paid) {
      throw new AppError("conflict", { userMessage: "ההזמנה כבר שולמה" });
    }
    if (TERMINAL.has(job.status)) {
      throw new AppError("conflict", { userMessage: "לא ניתן לשלם על הזמנה זו" });
    }

    const expected = this.guestChargeAmount(job);
    if (!(expected > 0)) {
      throw new AppError("bad_request", {
        userMessage: "אין סכום לתשלום עבור הזמנה זו",
      });
    }
    if (Math.abs(Number(dto.amount) - expected) > 0.01) {
      throw new AppError("bad_request", {
        userMessage: "סכום התשלום אינו תואם להזמנה",
      });
    }

    try {
      const order = await this.paypal.createCheckoutOrder({
        amount: expected.toFixed(2),
        currency: "ILS",
        // Unique per attempt so abandoned CREATED orders don't block retries.
        invoice_id: `goi-guest-${job.id}-${Date.now()}`,
        description: `Goi הזמנה ${job.job_number ?? job.id.slice(0, 8)}`,
      });
      if (!order?.id) {
        throw new Error("PayPal create order returned no id");
      }

      job.paypal_order_id = order.id;
      job.per_job_amount = String(expected);
      await this.jobs.save(job);

      return { order_id: order.id };
    } catch (e) {
      if (e instanceof AppError) throw e;
      this.logger.error(
        `guest paypal-order failed for ${job.id}`,
        e instanceof Error ? e.stack : e,
      );
      throw new AppError("upstream_failed", {
        userMessage: "יצירת תשלום PayPal נכשלה, נסה שוב",
        cause: e,
      });
    }
  }

  /**
   * Capture a guest PayPal order. Marks `per_job_paid` only after PayPal
   * reports COMPLETED — never fakes capture success.
   */
  async paypalCapture(dto: GuestPaypalCaptureDto) {
    this.requirePaypalConfigured();
    const job = await this.requireGuestJob(dto.job_id, dto.tracking_token);

    if (job.per_job_paid) {
      return { ok: true as const, already: true };
    }
    if (job.paypal_order_id && job.paypal_order_id !== dto.order_id) {
      throw new AppError("bad_request", { userMessage: "מזהה הזמנת PayPal אינו תואם" });
    }

    try {
      const captured = await this.paypal.captureOrder(dto.order_id);
      const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
      if (cap?.status !== "COMPLETED") {
        throw new AppError("upstream_failed", {
          userMessage: `תפיסת התשלום לא הושלמה (${cap?.status ?? "unknown"})`,
        });
      }

      job.per_job_paid = true;
      job.paypal_order_id = dto.order_id;
      if (!job.per_job_amount) {
        const expected = this.guestChargeAmount(job);
        if (expected > 0) job.per_job_amount = String(expected);
      }
      await this.jobs.save(job);

      return { ok: true as const, capture_id: cap.id };
    } catch (e) {
      if (e instanceof AppError) throw e;
      this.logger.error(
        `guest paypal-capture failed for ${job.id}`,
        e instanceof Error ? e.stack : e,
      );
      throw new AppError("upstream_failed", {
        userMessage: "תפיסת תשלום PayPal נכשלה, נסה שוב",
        cause: e,
      });
    }
  }

  /** Public mover board — limited fields by uuid or short_code. */
  async getPublicJob(ref: string) {
    const job = await this.findByPublicRef(ref);
    if (!job) return null;

    let partner_name: string | null = null;
    let partner_slug: string | null = null;
    if (job.partner_id) {
      const partner = await this.partners.findById(job.partner_id);
      partner_name = partner?.name ?? null;
      partner_slug = partner?.slug ?? null;
    }

    const price =
      job.pricing_type === "quote_request"
        ? null
        : Number(job.suggested_courier_payment ?? job.payment ?? 0) || null;

    return {
      id: job.id,
      job_number: job.job_number ?? null,
      short_code: job.short_code ?? null,
      service_category: job.service_category ?? null,
      package_type: null as string | null,
      package_size: null as string | null,
      number_of_packages: job.number_of_packages ?? null,
      description: job.description ?? null,
      pickup_area: job.pickup_area ?? null,
      pickup_address: job.pickup_address ?? null,
      dropoff_area: job.dropoff_area ?? null,
      dropoff_address: job.dropoff_address ?? null,
      job_date: job.job_date ?? null,
      job_time: job.job_time ?? null,
      estimated_distance_km:
        job.estimated_distance_km != null
          ? Number(job.estimated_distance_km)
          : null,
      price,
      status: job.status ?? null,
      partner_name,
      partner_slug,
      taken: await this.isJobTakenForLeads(job),
    };
  }

  async submitLead(ref: string, dto: SubmitJobLeadDto) {
    const job = await this.findByPublicRef(ref);
    if (!job) {
      throw new AppError("not_found", { userMessage: "העבודה לא נמצאה" });
    }
    if (await this.isJobTakenForLeads(job)) {
      throw new AppError("conflict", { userMessage: "העבודה כבר נתפסה" });
    }

    const digits = dto.phone.replace(/\D/g, "");
    if (digits.length < 9) {
      throw new AppError("bad_request", { userMessage: "נא למלא מספר טלפון תקין" });
    }
    if (dto.kind === "quote" && !(Number(dto.price) > 0)) {
      throw new AppError("bad_request", { userMessage: "נא למלא מחיר" });
    }

    let partnerName: string | null = null;
    let partnerSlug: string | null = null;
    if (job.partner_id) {
      const partner = await this.partners.findById(job.partner_id);
      partnerName = partner?.name ?? null;
      partnerSlug = partner?.slug ?? null;
    }

    const leadPrice =
      dto.kind === "quote"
        ? String(dto.price)
        : String(job.suggested_courier_payment ?? job.payment ?? "") || null;

    await this.leads.save(
      this.leads.create({
        job_id: job.id,
        kind: dto.kind,
        full_name: dto.full_name.trim(),
        phone: dto.phone.trim(),
        price: leadPrice,
        note: dto.note?.trim() || null,
        partner_slug: partnerSlug,
      }),
    );

    await this.notifyAdminOfLead(job, dto, partnerName);
    return { ok: true as const };
  }

  private async notifyAdminOfLead(
    job: Job,
    dto: SubmitJobLeadDto,
    partnerName: string | null,
  ) {
    try {
      const setting = await this.platform.get("admin_notify_phone");
      const raw =
        (typeof setting?.value === "string" ? setting.value : null) ||
        process.env.ADMIN_NOTIFY_PHONE ||
        "";
      const phone = String(raw).trim();
      if (!phone || !this.greenApi.isConfigured()) return;

      const pickup =
        [job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—";
      const dropoff =
        [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—";
      const when = [job.job_date, job.job_time].filter(Boolean).join(" ") || "עכשיו";
      const lines = [
        dto.kind === "take"
          ? `✅ *מוביל לקח עבודה*${job.job_number ? ` #${job.job_number}` : ""}`
          : `💬 *הצעת מחיר חדשה*${job.job_number ? ` #${job.job_number}` : ""}`,
        `👤 ${dto.full_name.trim()}`,
        `📱 ${dto.phone.trim()}`,
        dto.kind === "quote" && dto.price ? `💰 הצעה: ₪${dto.price}` : "",
        dto.kind === "take" && (job.suggested_courier_payment ?? job.payment)
          ? `💰 מחיר: ₪${job.suggested_courier_payment ?? job.payment}`
          : "",
        dto.note ? `📝 ${dto.note}` : "",
        "",
        `📍 מ: ${pickup}`,
        `🎯 ל: ${dropoff}`,
        `⏰ ${when}`,
        partnerName ? `🤝 שותף: ${partnerName}` : "",
      ].filter(Boolean);
      await this.greenApi.sendText(phone, lines.join("\n"));
    } catch (e) {
      this.logger.error(
        `[public-job] admin notify failed for ${job.id}`,
        e instanceof Error ? e.stack : e,
      );
    }
  }

  /** Guest reprice + WhatsApp group resend while unassigned. */
  async repriceGuest(jobId: string, dto: GuestRepriceJobDto) {
    const job = await this.requireGuestJob(jobId, dto.tracking_token);
    return this.applyRepriceAndResend(job, dto.price);
  }

  async applyRepriceAndResend(job: Job, price: number) {
    if (!(price > 0)) {
      throw new AppError("bad_request", { userMessage: "נא למלא מחיר תקין" });
    }
    if (job.selected_courier_id) {
      throw new AppError("conflict", {
        userMessage: "כבר שובץ מוביל — לא ניתן לעדכן מחיר",
      });
    }
    if (["הושלמה", "בוטלה", "פעילה"].includes(String(job.status))) {
      throw new AppError("conflict", {
        userMessage: "לא ניתן לעדכן הזמנה במצב זה",
      });
    }
    if (job.pricing_type === "quote_request") {
      throw new AppError("conflict", {
        userMessage: "לא ניתן לעדכן מחיר לבקשת הצעות",
      });
    }

    job.customer_price = String(price);
    job.payment = String(price);
    job.suggested_courier_payment = String(price);
    job.pricing_type = "fixed_price";
    job.status = "נשלחה לשליחים";
    await this.ensureShortCode(job);
    await this.jobs.save(job);

    const whatsapp = await this.whatsappDispatch.notifyJobDispatched(job);
    return { ok: true as const, whatsapp };
  }

  // ── Guest ↔ admin support chat (token-gated) ──────────────────────────

  private async getOrCreateGuestSupportConversation(job: Job): Promise<Conversation> {
    let conversation = await this.conversations.findOne({
      where: {
        kind: "guest_support",
        job_id: job.id,
      },
    });
    if (conversation) return conversation;

    const subjectParts = [
      job.job_number ? `#${job.job_number}` : null,
      job.guest_name?.trim() || null,
      job.pickup_address?.trim() || null,
    ].filter(Boolean);

    conversation = await this.conversations.save(
      this.conversations.create({
        kind: "guest_support",
        courier_id: null,
        business_id: null,
        job_id: job.id,
        subject: subjectParts.join(" · ") || "תמיכת לקוח",
        last_message_at: new Date(),
        last_message_preview: null,
        unread_admin: 0,
        unread_business: 0,
        unread_courier: 0,
        unread_guest: 0,
      }),
    );
    return conversation;
  }

  async openGuestChat(jobId: string, dto: GuestChatOpenDto) {
    const job = await this.requireGuestJob(jobId, dto.tracking_token);
    const conversation = await this.getOrCreateGuestSupportConversation(job);
    return {
      conversation,
      job: {
        id: job.id,
        job_number: job.job_number,
        status: job.status,
        guest_name: job.guest_name,
        guest_phone: job.guest_phone,
        pickup_address: job.pickup_address,
        dropoff_address: job.dropoff_address,
      },
    };
  }

  async listGuestChatMessages(jobId: string, dto: GuestChatListDto) {
    const job = await this.requireGuestJob(jobId, dto.tracking_token);
    const conversation = await this.getOrCreateGuestSupportConversation(job);
    const messages = await this.messages.find({
      where: { conversation_id: conversation.id },
      order: { created_at: "ASC" },
    });
    return { conversation, messages };
  }

  async postGuestChatMessage(jobId: string, dto: GuestChatPostMessageDto) {
    const job = await this.requireGuestJob(jobId, dto.tracking_token);
    const conversation = await this.getOrCreateGuestSupportConversation(job);
    const body = dto.body.trim();
    if (!body) {
      throw new AppError("bad_request", { userMessage: "נא להזין הודעה" });
    }

    // sender_user_id must be a UUID; use job id as the stable guest identity.
    const message = await this.messages.save(
      this.messages.create({
        conversation_id: conversation.id,
        sender_user_id: job.id,
        sender_role: "guest",
        body,
        attachment_url: null,
        attachment_kind: null,
        attachment_name: null,
        attachment_mime: null,
        attachment_size: null,
        duration_ms: null,
      }),
    );

    conversation.last_message_at = message.created_at;
    conversation.last_message_preview = body.slice(0, 250);
    conversation.unread_admin += 1;
    await this.conversations.save(conversation);

    return { conversation, message };
  }

  async markGuestChatRead(jobId: string, dto: GuestChatMarkReadDto) {
    const job = await this.requireGuestJob(jobId, dto.tracking_token);
    const conversation = await this.getOrCreateGuestSupportConversation(job);
    conversation.unread_guest = 0;
    await this.conversations.save(conversation);
    return { ok: true as const, conversation_id: conversation.id };
  }
}
