import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const getWhatsAppProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { providerStatus } = await import("@/lib/whatsapp/provider.server");
    return providerStatus();
  });

export const sendWhatsAppProviderTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { phone: string; message: string }) => {
    if (!data?.phone || !data?.message) throw new Error("phone + message required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sendText, getActiveProvider } = await import("@/lib/whatsapp/provider.server");
    const res = await sendText(data.phone, data.message);
    return { provider: getActiveProvider(), result: res };
  });
