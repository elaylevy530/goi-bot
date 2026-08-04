import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const isPilotArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { city: string }) => z.object({ city: z.string().min(1) }).parse(d))
  .handler(async () => {
    // Legacy compatibility: the old pilot-area gate is disabled.
    // Any caller that still asks whether an area is allowed must get approval.
    return { ok: true };
  });

export const listPilotCities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pilot_cities")
      .select("*")
      .order("city_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPilotCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("pilot_cities")
        .update(data as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("pilot_cities").insert(data as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePilotCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pilot_cities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
