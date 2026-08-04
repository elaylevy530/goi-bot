import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

// has_role isn't in the generated types yet — call via cast
async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: boolean | null }> };
  const { data } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_chat_threads")
      .select("id, title, last_message_at, created_at")
      .eq("owner_id", context.userId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_chat_threads")
      .insert({ owner_id: context.userId, title: "שיחה חדשה" })
      .select("id, title, last_message_at, created_at")
      .single();
    if (error) throw error;
    return data;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("admin_chat_threads")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: thread } = await context.supabase
      .from("admin_chat_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!thread) return [] as Array<{ id: string; role: string; parts: Json }>;

    const { data: rows, error } = await context.supabase
      .from("admin_chat_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r) => ({ id: r.id, role: r.role, parts: r.parts }));
  });
