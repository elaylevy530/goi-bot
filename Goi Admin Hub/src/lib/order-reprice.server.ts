/**
 * Update the fixed price of an open order and re-broadcast it to the
 * WhatsApp group (partner group when the job belongs to a partner).
 * Only valid while no courier/mover is assigned yet.
 */
export async function repriceAndResend(jobId: string, price: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) throw new Error("Not found");

  const j = job as Record<string, any>;
  if (j.selected_courier_id) throw new Error("כבר שובץ מוביל — לא ניתן לעדכן מחיר");
  if (["הושלמה", "בוטלה", "פעילה"].includes(String(j.status)))
    throw new Error("לא ניתן לעדכן הזמנה במצב זה");

  const { error: upErr } = await supabaseAdmin
    .from("jobs")
    .update({
      customer_price: price,
      payment: price,
      pricing_type: "fixed_price",
      status: "נשלחה לשליחים",
    } as never)
    .eq("id", jobId);
  if (upErr) throw new Error(upErr.message);

  const updated = { ...j, customer_price: price, payment: price, pricing_type: "fixed_price" };

  let partner: any = null;
  if (j.partner_id) {
    const { data: p } = await supabaseAdmin
      .from("partners")
      .select("name, contact_phone, whatsapp_group_id, dispatch_note, message_sections, message_cta")
      .eq("id", j.partner_id)
      .maybeSingle();
    partner = p ?? null;
  }

  try {
    const { sendJobToWhatsAppGroup } = await import("./whatsapp/group-dispatch.server");
    const res = await sendJobToWhatsAppGroup(updated as any, partner);
    return { ok: true, whatsapp: res };
  } catch (e) {
    console.error("[reprice] whatsapp group resend failed:", e);
    return { ok: true, whatsapp: { skipped: true, reason: "send failed" } };
  }
}
