/**
 * Admin-facing server functions for the WhatsApp dispatch groups picker.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

function creds() {
  const id = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!id || !token) throw new Error("Green API credentials are not configured");
  const base = `https://${id.substring(0, 4)}.api.green-api.com/waInstance${id}`;
  return { id, token, base };
}

export type GreenApiGroup = { chatId: string; name: string };

export const listGreenApiGroups = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }): Promise<{ groups: GreenApiGroup[]; wid: string | null }> => {
    assertNestAdmin(context);
    const { base, token } = creds();

    const r = await fetch(`${base}/getContacts/${token}`);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`getContacts failed: ${r.status} ${t.slice(0, 200)}`);
    }
    const list = (await r.json()) as Array<{ id: string; name?: string; type?: string }>;

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
  .middleware([requireNestAuth])
  .handler(async ({ context }): Promise<DispatchGroupsRow> => {
    assertNestAdmin(context);
    const data = await nestServerFetch<DispatchGroupsRow>("/api/whatsapp/dispatch-groups", {
      accessToken: context.accessToken,
    });
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
  .middleware([requireNestAuth])
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
    assertNestAdmin(context);
    await nestServerFetch("/api/whatsapp/dispatch-groups", {
      accessToken: context.accessToken,
      method: "PUT",
      body: data,
    });
    return { ok: true };
  });
