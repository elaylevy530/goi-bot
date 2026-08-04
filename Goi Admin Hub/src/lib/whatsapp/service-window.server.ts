/**
 * WhatsApp 24-hour service window helper.
 *
 * Meta Cloud API: outside the 24h customer-care window only approved templates
 * may be sent (any free-form/interactive call returns error 131047/131026).
 * Green API has no such restriction, but we still record the window so the
 * codebase is identical when WHATSAPP_PROVIDER flips to "cloud".
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function isServiceWindowOpen(phone: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("wa_service_window_open", { _phone: phone });
  if (error) {
    console.error("[wa.service-window] check failed:", error.message);
    return false;
  }
  return !!data;
}

export async function recordInboundMessage(phone: string, provider: "green" | "cloud" = "green") {
  if (!phone) return;
  try {
    await supabaseAdmin.rpc("wa_record_inbound", { _phone: phone, _provider: provider });
  } catch (e) {
    console.error("[wa.service-window] record failed:", (e as Error).message);
  }
}
