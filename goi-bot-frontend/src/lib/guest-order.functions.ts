import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

const refSchema = z.object({ job_id: z.string().uuid(), tracking_token: z.string().min(16) });
const createSchema = z.object({
  service_category: z.enum(["same_day", "scheduled", "small_move", "big_move"]),
  guest_name: z.string().min(2),
  guest_phone: z.string().min(9),
  pickup_address: z.string().min(3),
  dropoff_address: z.string().min(3),
  partner_slug: z.string().trim().max(60).optional().nullable(),
}).passthrough();

export const getPricingRulesFn = createServerFn({ method: "GET" })
  .handler(() => nestServerFetch("/api/pricing/express-active"));

export const getGuestJobStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/status`, { method: "POST", body: data }),
  );

export const createGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch("/api/public/jobs", { method: "POST", body: data }),
  );

export const confirmGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/confirm`, { method: "POST", body: data }),
  );

export const createGuestPaypalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.extend({ amount: z.number().positive() }).parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/paypal-order`, { method: "POST", body: data }),
  );

export const captureGuestPaypalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.extend({ order_id: z.string().min(4) }).parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/paypal-capture`, { method: "POST", body: data }),
  );

export const getGuestJobQuotesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/quotes`, { method: "POST", body: data }),
  );

export const selectGuestJobQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.extend({ quote_id: z.string().uuid() }).parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/quotes/${data.quote_id}/select`, {
      method: "POST",
      body: data,
    }),
  );

export const getGuestOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ refs: z.array(refSchema).max(50) }).parse(data))
  .handler(({ data }) =>
    nestServerFetch("/api/public/jobs/list", { method: "POST", body: data }),
  );

export const getGuestOrderDetailFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}`, { method: "POST", body: data }),
  );

export const cancelGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}`, {
      method: "PATCH",
      body: { ...data, status: "בוטלה" },
    }),
  );

export const repriceGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    refSchema.extend({ price: z.number().positive().max(100000) }).parse(data),
  )
  .handler(({ data }) =>
    nestServerFetch(`/api/public/jobs/${data.job_id}/reprice`, {
      method: "POST",
      body: {
        tracking_token: data.tracking_token,
        price: data.price,
      },
    }),
  );
