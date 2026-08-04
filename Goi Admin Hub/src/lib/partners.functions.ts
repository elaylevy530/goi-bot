import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { JobMessageInput } from "@/lib/whatsapp/job-message-template";

export type PartnerPublic = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
};

export type PartnerRow = PartnerPublic & {
  whatsapp_group_id: string | null;
  dispatch_note: string | null;
  is_active: boolean;
  message_sections: Record<string, boolean> | null;
  message_cta: string | null;
};

/** Public: resolve a partner panel by its slug (used by /p/$slug). */
export const getPartnerBySlugFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data }): Promise<PartnerPublic | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("partners")
      .select("id, slug, name, logo_url, contact_phone")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    return (row as PartnerPublic | null) ?? null;
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const listPartnersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("id, slug, name, logo_url, contact_phone, whatsapp_group_id, dispatch_note, is_active, message_sections, message_cta")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PartnerRow[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "רק אותיות אנגליות קטנות, ספרות ומקף"),
  name: z.string().trim().min(2).max(80),
  logo_url: z.string().trim().max(500).optional().nullable(),
  contact_phone: z.string().trim().max(20).optional().nullable(),
  whatsapp_group_id: z.string().trim().max(120).optional().nullable(),
  dispatch_note: z.string().trim().max(300).optional().nullable(),
  is_active: z.boolean(),
  message_sections: z.record(z.string(), z.boolean()).optional().nullable(),
  message_cta: z.string().trim().max(200).optional().nullable(),
});

export const upsertPartnerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      slug: data.slug,
      name: data.name,
      logo_url: data.logo_url || null,
      contact_phone: data.contact_phone || null,
      whatsapp_group_id: data.whatsapp_group_id || null,
      dispatch_note: data.dispatch_note || null,
      is_active: data.is_active,
      message_sections: data.message_sections ?? {},
      message_cta: data.message_cta || null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("partners").update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("partners")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const deletePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("partners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: latest job created from this partner panel — used for the live message preview. */
export const getPartnerLastJobFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ partnerId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<JobMessageInput | null> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("jobs")
      .select(
        "id, job_number, short_code, service_category, package_type, package_size, number_of_packages, fragile, description, pickup_address, pickup_area, pickup_notes, dropoff_address, dropoff_area, dropoff_floor, dropoff_notes, recipient_name, recipient_phone, estimated_distance_km, vehicle_required, job_date, job_time, delivery_deadline, suggested_courier_payment, payment",
      )
      .order("created_at", { ascending: false })
      .limit(1);
    if (data.partnerId) q = q.eq("partner_id", data.partnerId);
    const { data: rows } = await q;
    return (rows?.[0] as JobMessageInput | undefined) ?? null;
  });
