import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

function normalize(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!p.startsWith("972") && p.length === 9) p = "972" + p;
  return p;
}

export const getWaMaintenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("wa_maintenance")
      .select("enabled, allowlist, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      enabled: !!data?.enabled,
      allowlist: (data?.allowlist as string[] | null) ?? [],
      updatedAt: data?.updated_at ?? null,
    };
  });

export const updateWaMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean; allowlist: string[] }) =>
    z
      .object({
        enabled: z.boolean(),
        allowlist: z.array(z.string()).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cleaned = Array.from(
      new Set(data.allowlist.map(normalize).filter((p) => p.length >= 10)),
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("wa_maintenance")
      .upsert({
        id: true,
        enabled: data.enabled,
        allowlist: cleaned,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      });
    if (error) throw new Error(error.message);
    const { invalidateMaintenanceCache } = await import("./whatsapp/maintenance.server");
    invalidateMaintenanceCache();
    return { ok: true, enabled: data.enabled, allowlist: cleaned };
  });
