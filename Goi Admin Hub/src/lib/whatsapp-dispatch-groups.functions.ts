/**
 * Admin-facing server functions for the WhatsApp dispatch groups picker.
 *
 * - listGreenApiGroups: pulls all chats from Green API and returns just the
 *   groups (@g.us) so an admin can pick "משלוחים" / "הובלות".
 * - getDispatchGroups / setDispatchGroups: read/write the singleton row in
 *   public.whatsapp_dispatch_settings.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

function creds() {
  const id = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!id || !token) throw new Error("Green API credentials are not configured");
  const base = `https://${id.substring(0, 4)}.api.green-api.com/waInstance${id}`;
  return { id, token, base };
}

export type GreenApiGroup = { chatId: string; name: string };

export const listGreenApiGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ groups: GreenApiGroup[]; wid: string | null }> => {
    await assertAdmin(context.supabase, context.userId);
    const { base, token } = creds();

    // getContacts returns all chats known to the instance, including groups.
    const r = await fetch(`${base}/getContacts/${token}`);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`getContacts failed: ${r.status} ${t.slice(0, 200)}`);
    }
    const list = (await r.json()) as Array<{ id: string; name?: string; type?: string }>;

    // Fetch instance owner id for display.
    let wid: string | null = null;
    try {
      const s = await fetch(`${base}/getSettings/${token}`);
      if (s.ok) {
        const j: any = await s.json();
        wid = j?.wid ?? null;
      }
    } catch { /* ignore */ }

    const groups: GreenApiGroup[] = (Array.isArray(list) ? list : [])
      .filter((c) => typeof c?.id === "string" && c.id.endsWith("@g.us"))
      .map((c) => ({ chatId: c.id, name: (c.name || c.id).toString() }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));

    return { groups, wid };
  });

export type DispatchGroupsRow = {
  couriers_group_id: string | null;
  couriers_group_name: string | null;
  movers_group_id: string | null;
  movers_group_name: string | null;
  updated_at: string | null;
};

export const getDispatchGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DispatchGroupsRow> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("whatsapp_dispatch_settings")
      .select("couriers_group_id, couriers_group_name, movers_group_id, movers_group_name, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        couriers_group_id: null,
        couriers_group_name: null,
        movers_group_id: null,
        movers_group_name: null,
        updated_at: null,
      }
    );
  });

export const setDispatchGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        couriers_group_id: z.string().nullable(),
        couriers_group_name: z.string().nullable(),
        movers_group_id: z.string().nullable(),
        movers_group_name: z.string().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("whatsapp_dispatch_settings")
      .upsert(
        {
          id: true,
          couriers_group_id: data.couriers_group_id || null,
          couriers_group_name: data.couriers_group_name || null,
          movers_group_id: data.movers_group_id || null,
          movers_group_name: data.movers_group_name || null,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        } as never,
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin phone that receives mover responses (take / price offers) from /j/<id>. */
export const getAdminNotifyPhone = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ phone: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "admin_notify_phone")
      .maybeSingle();
    return { phone: ((data as any)?.value as string) ?? "" };
  });

export const setAdminNotifyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ phone: z.string().trim().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_config")
      .upsert(
        { key: "admin_notify_phone", value: data.phone, updated_at: new Date().toISOString() } as never,
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
