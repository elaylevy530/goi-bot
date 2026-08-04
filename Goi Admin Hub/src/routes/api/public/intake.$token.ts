import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * Public intake endpoint for restaurant/business websites.
 *
 * POST https://<host>/api/public/intake/<integration_token>
 *
 * Body (JSON):
 * {
 *   "customer_name":  "string",
 *   "customer_phone": "05X-XXXXXXX",
 *   "dropoff_address": "רחוב + מספר + עיר",
 *   "dropoff_city":   "optional",
 *   "dropoff_notes":  "optional",
 *   "order_total":    123.45,           // optional, customer order total
 *   "items":          "מרגריטה x1 ...", // optional free text
 *   "external_ref":   "optional"        // your internal order id
 * }
 *
 * Optional security: HMAC-SHA256 of the raw body using `webhook_secret`,
 * passed in header `x-signature`.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-signature",
};

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/public/intake/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ params }) =>
        jsonResponse({ ok: true, token: params.token, info: "POST orders to this URL" }),

      POST: async ({ request, params }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const token = params.token;
          const rawBody = await request.text();

        // 1. Find integration
        const { data: integ } = await supabaseAdmin
          .from("business_integrations")
          .select("*")
          .eq("integration_token", token)
          .maybeSingle();

        if (!integ || !integ.enabled) {
          return jsonResponse({ ok: false, error: "Invalid or disabled token" }, 401);
        }

        // 2. Verify HMAC if provided
        const signature = request.headers.get("x-signature");
        if (signature) {
          try {
            const expected = createHmac("sha256", integ.webhook_secret)
              .update(rawBody)
              .digest("hex");
            const a = Buffer.from(signature);
            const b = Buffer.from(expected);
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              await supabaseAdmin.from("integration_request_logs").insert({
                business_id: integ.business_id,
                source: "api",
                payload: safeJson(rawBody),
                status: "error",
                error: "bad signature",
              });
              return jsonResponse({ ok: false, error: "Invalid signature" }, 401);
            }
          } catch {
            return jsonResponse({ ok: false, error: "Signature check failed" }, 401);
          }
        }

        // 3. Parse + validate body
        let parsed;
        try {
          const body = JSON.parse(rawBody);
          parsed = payloadSchema.parse(body);
        } catch (err: any) {
          await supabaseAdmin.from("integration_request_logs").insert({
            business_id: integ.business_id,
            source: "api",
            payload: safeJson(rawBody),
            status: "error",
            error: `validation: ${err?.message ?? "invalid body"}`,
          });
          return jsonResponse({ ok: false, error: "Invalid payload", details: err?.errors }, 400);
        }

        // 4. Resolve default pickup branch
        const { data: business } = await supabaseAdmin
          .from("customers")
          .select("id, name, business_name, phone, address, city")
          .eq("id", integ.business_id)
          .maybeSingle();

        if (!business) {
          return jsonResponse({ ok: false, error: "Business not found" }, 404);
        }

        const { data: branches } = await supabaseAdmin
          .from("business_branches")
          .select("*")
          .eq("business_id", integ.business_id)
          .order("is_default", { ascending: false })
          .limit(1);

        const branch = branches?.[0];

        const pricing_type = integ.default_pricing_type === "quote_request" ? "quote_request" : "fixed_price";
        const matching_model = pricing_type === "quote_request" ? "quote_request" : "fastest";
        const courierPay = integ.default_fixed_price ? Number(integ.default_fixed_price) : 0;

        const descriptionParts: string[] = [];
        if (parsed.external_ref) descriptionParts.push(`הזמנה: ${parsed.external_ref}`);
        if (parsed.items) descriptionParts.push(parsed.items);
        if (parsed.order_total) descriptionParts.push(`סכום הזמנה: ₪${parsed.order_total}`);

        // 5. Insert job
        const jobPayload: Record<string, unknown> = {
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
          matching_model,
          pricing_type,
          suggested_courier_payment: pricing_type === "fixed_price" ? courierPay : null,
          customer_price: parsed.order_total ?? null,
          payment: pricing_type === "fixed_price" ? courierPay : 0,
          description: descriptionParts.join(" | ") || null,
          invoice_required: false,
          status: integ.auto_mode ? "נשלחה לשליחים" : "טיוטה",
        };

        const { data: job, error: jobErr } = await supabaseAdmin
          .from("jobs")
          .insert(jobPayload)
          .select("id, job_number")
          .single();

        if (jobErr || !job) {
          await supabaseAdmin.from("integration_request_logs").insert({
            business_id: integ.business_id,
            source: "api",
            payload: parsed as any,
            status: "error",
            error: jobErr?.message ?? "insert failed",
          });
          return jsonResponse({ ok: false, error: "Failed to create job" }, 500);
        }

        // 6. Trigger courier notification for quote-request flow
        if (integ.auto_mode && pricing_type === "quote_request") {
          try {
            const { notifyCouriersOfQuoteRequest } = await import("@/lib/whatsapp-quotes.functions");
            await (notifyCouriersOfQuoteRequest as any).handler({ data: { jobId: job.id }, context: {} });
          } catch (err) {
            console.error("notify couriers failed", err);
          }
        }

        await supabaseAdmin.from("integration_request_logs").insert({
          business_id: integ.business_id,
          source: "api",
          payload: parsed as any,
          status: "ok",
          job_id: job.id,
        });

          return jsonResponse({
            ok: true,
            job_id: job.id,
            job_number: job.job_number,
            tracking_url: `/business/track/${job.id}`,
          });
        } catch (err) {
          console.error("[api.public.intake] unhandled", err);
          return jsonResponse({ ok: false, error: "Internal error" }, 500);
        }
      },
    },
  },
});

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
