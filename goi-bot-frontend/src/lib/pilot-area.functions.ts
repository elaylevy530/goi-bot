import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

export const isPilotArea = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { city: string }) => z.object({ city: z.string().min(1) }).parse(d))
  .handler(async () => {
    return { ok: true };
  });

export const listPilotCities = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    return nestServerFetch("/api/pilot-cities", {
      accessToken: context.accessToken,
    });
  });

export const upsertPilotCity = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id?: string; city_name: string; is_active: boolean; max_radius_km?: number | null; notes?: string | null }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        city_name: z.string().min(1),
        is_active: z.boolean(),
        max_radius_km: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch("/api/pilot-cities", {
      accessToken: context.accessToken,
      method: "POST",
      body: data,
    });
    return { ok: true };
  });

export const deletePilotCity = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    await nestServerFetch(`/api/pilot-cities/${data.id}`, {
      accessToken: context.accessToken,
      method: "DELETE",
    });
    return { ok: true };
  });
