import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendApprovalPendingBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendText } = await import("./green-api.server");

    const { data: couriers, error } = await supabaseAdmin
      .from("couriers")
      .select("id, full_name, whatsapp_phone")
      .eq("courier_status", "פעיל")
      .eq("admin_jobs_blocked", true);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    for (const c of couriers ?? []) {
      if (!c.whatsapp_phone) continue;
      const name = (c.full_name ?? "").trim() || "שליח";
      const body =
        `שלום ${name} 👋\n\n` +
        `החשבון שלך ב-Goi רשום כ*מאושר אך מושהה זמנית* ⏸️\n\n` +
        `אנחנו עוברים על הפרטים ידנית לפני הפעלה סופית.\n` +
        `ברגע שתאושר תקבל הודעה כאן ותתחיל לקבל הצעות עבודה.\n\n` +
        `אין צורך לעשות כלום — נחזור אליך בקרוב 🙏\n` +
        `— צוות Goi`;
      try {
        const res: any = await sendText(c.whatsapp_phone, body);
        await supabaseAdmin.from("whatsapp_messages").insert({
          courier_id: c.id,
          direction: "outbound",
          body,
          status: "sent",
          external_message_id: res?.idMessage ?? null,
        } as never);
        sent++;
      } catch (e) {
        failed++;
      }
    }

    return { ok: true, total: couriers?.length ?? 0, sent, failed };
  });
