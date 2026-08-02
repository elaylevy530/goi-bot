import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac, timingSafeEqual } from "crypto";
import { Repository } from "typeorm";
import { z } from "zod";
import { BusinessBranch } from "../accounts/entities/business-branch.entity";
import { BusinessIntegration } from "../accounts/entities/business-integration.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { IntegrationRequestLog } from "../accounts/entities/integration-request-log.entity";
import { Job } from "../jobs/entities/job.entity";

const payloadSchema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().min(7).max(40),
  dropoff_address: z.string().trim().min(2).max(300),
  dropoff_city: z.string().trim().max(120).optional().nullable(),
  dropoff_notes: z.string().trim().max(1000).optional().nullable(),
  order_total: z.coerce.number().nonnegative().optional().nullable(),
  items: z.string().trim().max(2000).optional().nullable(),
  external_ref: z.string().trim().max(120).optional().nullable(),
});

type IntakeResult = { status: number; body: Record<string, unknown> };

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

/** Stand-in job number generator until JobsModule owns a proper DB sequence. */
function generateJobNumber(): string {
  return `GOI-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(
    @InjectRepository(BusinessIntegration)
    private readonly integrations: Repository<BusinessIntegration>,
    @InjectRepository(BusinessBranch)
    private readonly branches: Repository<BusinessBranch>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
    @InjectRepository(IntegrationRequestLog)
    private readonly logs: Repository<IntegrationRequestLog>,
  ) {}

  async handle(token: string, rawBody: string, signature: string | undefined): Promise<IntakeResult> {
    const integ = await this.integrations.findOne({ where: { integration_token: token } });
    if (!integ || !integ.enabled) {
      return { status: 401, body: { ok: false, error: "Invalid or disabled token" } };
    }

    if (signature) {
      const verified = this.verifySignature(rawBody, signature, integ.webhook_secret);
      if (!verified) {
        await this.log(integ.business_id, safeJson(rawBody), "error", "bad signature");
        return { status: 401, body: { ok: false, error: "Invalid signature" } };
      }
    }

    let parsed: z.infer<typeof payloadSchema>;
    try {
      parsed = payloadSchema.parse(JSON.parse(rawBody));
    } catch (err) {
      const message = err instanceof z.ZodError ? err.message : (err as Error)?.message;
      await this.log(integ.business_id, safeJson(rawBody), "error", `validation: ${message ?? "invalid body"}`);
      return {
        status: 400,
        body: {
          ok: false,
          error: "Invalid payload",
          details: err instanceof z.ZodError ? err.issues : undefined,
        },
      };
    }

    const business = await this.customers.findOne({
      where: { id: integ.business_id },
      select: ["id", "name", "business_name", "phone", "address", "city"],
    });
    if (!business) {
      return { status: 404, body: { ok: false, error: "Business not found" } };
    }

    const branch = await this.branches.findOne({
      where: { business_id: integ.business_id },
      order: { is_default: "DESC" },
    });

    const pricingType = integ.default_pricing_type === "quote_request" ? "quote_request" : "fixed_price";
    const matchingModel = pricingType === "quote_request" ? "quote_request" : "fastest";
    const courierPay = integ.default_fixed_price ? Number(integ.default_fixed_price) : 0;

    const descriptionParts: string[] = [];
    if (parsed.external_ref) descriptionParts.push(`הזמנה: ${parsed.external_ref}`);
    if (parsed.items) descriptionParts.push(parsed.items);
    if (parsed.order_total) descriptionParts.push(`סכום הזמנה: ₪${parsed.order_total}`);

    const job = this.jobs.create({
      job_number: generateJobNumber(),
      customer_id: integ.business_id,
      customer_name: business.business_name || business.name,
      job_type: "משלוח בודד",
      pickup_branch_id: branch?.id ?? null,
      pickup_address: branch?.full_address ?? business.address ?? null,
      pickup_area: branch?.city ?? business.city ?? null,
      pickup_contact_name: branch?.contact_person ?? business.name ?? null,
      pickup_contact_phone: branch?.phone ?? business.phone ?? null,
      pickup_notes: branch?.courier_notes ?? null,
      dropoff_address: parsed.dropoff_address,
      dropoff_area: parsed.dropoff_city ?? null,
      recipient_name: parsed.customer_name,
      recipient_phone: parsed.customer_phone,
      dropoff_notes: parsed.dropoff_notes ?? null,
      number_of_packages: 1,
      matching_model: matchingModel,
      pricing_type: pricingType,
      suggested_courier_payment: pricingType === "fixed_price" ? String(courierPay) : null,
      customer_price: parsed.order_total != null ? String(parsed.order_total) : null,
      payment: pricingType === "fixed_price" ? String(courierPay) : "0",
      description: descriptionParts.join(" | ") || null,
      invoice_required: false,
      status: integ.auto_mode ? "נשלחה לשליחים" : "טיוטה",
    });

    let saved: Job;
    try {
      saved = await this.jobs.save(job);
    } catch (err) {
      await this.log(
        integ.business_id,
        parsed,
        "error",
        (err as Error)?.message ?? "insert failed",
      );
      return { status: 500, body: { ok: false, error: "Failed to create job" } };
    }

    if (integ.auto_mode && pricingType === "quote_request") {
      // TODO(phase2): port notifyCouriersOfQuoteRequest once dispatch/quotes
      // live in Nest. Job is created either way; courier notification is the
      // only piece deferred here.
      this.logger.warn(
        `intake job ${saved.id} created as quote_request but courier notification is not yet ported`,
      );
    }

    await this.log(integ.business_id, parsed, "ok", null, saved.id);

    return {
      status: 200,
      body: {
        ok: true,
        job_id: saved.id,
        job_number: saved.job_number,
        tracking_url: `/business/track/${saved.id}`,
      },
    };
  }

  private verifySignature(rawBody: string, signature: string, secret: string): boolean {
    try {
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  async meta(token: string) {
    const integ = await this.integrations.findOne({ where: { integration_token: token } });
    if (!integ) return null;
    const customer = await this.customers.findOne({
      where: { id: integ.business_id },
      select: ["id", "name", "business_name"],
    });
    return {
      enabled: integ.enabled,
      business_id: integ.business_id,
      customers: customer
        ? { name: customer.name, business_name: customer.business_name ?? customer.name }
        : null,
    };
  }

  private async log(
    businessId: string,
    payload: unknown,
    status: "ok" | "error",
    error: string | null,
    jobId?: string,
  ): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          business_id: businessId,
          source: "api",
          payload: payload as Record<string, unknown>,
          status,
          error,
          job_id: jobId ?? null,
        }),
      );
    } catch (e) {
      this.logger.error("failed to write integration_request_logs", e instanceof Error ? e.stack : e);
    }
  }
}
