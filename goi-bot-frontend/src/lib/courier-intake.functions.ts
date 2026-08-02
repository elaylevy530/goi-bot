import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assertNestAdmin,
  requireNestAuth,
} from "@/integrations/nest/auth-middleware";
import { matchTagIds, type ClassificationRule } from "./classification";

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

const intakeSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  whatsapp_phone: z.string().trim().regex(phoneRegex),
  id_number: z.string().trim().regex(/^\d{5,12}$/, "מספר ת״ז לא תקין").optional().nullable(),
  id_photo_base64: z.string().max(10_000_000).optional().nullable(),
  id_photo_mime: z.string().max(80).optional().nullable(),
  id_photo_back_base64: z.string().max(10_000_000).optional().nullable(),
  id_photo_back_mime: z.string().max(80).optional().nullable(),
  base_city: z.string().trim().min(1).max(80),
  wanted_work_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_work_area: z.string().trim().max(120).optional().nullable(),
  pickup_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_pickup_area: z.string().trim().max(120).optional().nullable(),
  dropoff_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_dropoff_area: z.string().trim().max(120).optional().nullable(),
  work_distance_from_base: z.string().trim().max(60).optional().nullable(),
  vehicle_types: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  job_types: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  invoice_status: z.enum(["כן", "לא", "תסדרו אותי"]).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  courier_experience_status: z.string().trim().max(60).optional().nullable(),
  courier_experience_duration: z.string().trim().max(60).optional().nullable(),
  consent_whatsapp: z.boolean().default(true),
  password: z.string().min(6).max(72).optional().nullable(),
  courier_kind: z.enum(["courier", "mover"]).default("courier"),
});

export type CourierIntakeInput = z.infer<typeof intakeSchema>;

function nestApiBase(): string {
  return (
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

/**
 * Legacy serverFn — JoinPage now calls Nest directly via nestRegisterCourier.
 * Kept as a thin Nest proxy for any remaining callers.
 */
export const registerCourier = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => intakeSchema.parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(`${nestApiBase()}/api/auth/register/courier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error?.message || `Courier register failed (${res.status})`,
      );
    }
    return (await res.json()) as { id: string; accountCreated: boolean };
  });

export const reclassifyCourier = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    // Classification rules still need Nest Domain module; no-op tag refresh until then.
    void matchTagIds;
    void (null as ClassificationRule | null);
    return { tagCount: 0, id: data.id };
  });

export const approveCourier = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), suspended: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    const res = await fetch(
      `${nestApiBase()}/api/accounts/couriers/${data.id}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${context.accessToken}`,
        },
        body: JSON.stringify({ suspended: data.suspended === true }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `Approve failed (${res.status})`);
    }
    return {
      ok: true,
      whatsappSent: false,
      error: null,
      whatsappInsertError: null,
    };
  });

export const getIdPhotoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ path: z.string().min(1).max(500) }).parse(data),
  )
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    throw new Error(
      "ID photo storage is not wired through Nest yet.",
    );
  });

export const deleteCourier = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    const res = await fetch(
      `${nestApiBase()}/api/accounts/couriers/${data.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${context.accessToken}` },
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `Delete failed (${res.status})`);
    }
    return { ok: true };
  });
