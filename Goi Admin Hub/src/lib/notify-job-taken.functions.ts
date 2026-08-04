import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notify the WhatsApp dispatch group that a job was taken by a courier.
 * Called from the courier app after a successful accept/claim.
 */
export const notifyJobTakenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendJobTakenToWhatsAppGroup } = await import(
      "./whatsapp/group-dispatch.server"
    );

    const { data: job } = await supabase
      .from("jobs")
      .select(
        "id, service_category, package_type, pickup_address, pickup_area, dropoff_address, dropoff_area",
      )
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) return { skipped: true, reason: "job not found" };

    let courierName: string | null = null;
    try {
      const { data: c } = await supabaseAdmin
        .from("couriers")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      courierName = (c as any)?.full_name ?? null;
    } catch {}

    try {
      return await sendJobTakenToWhatsAppGroup(job as any, courierName);
    } catch (e: any) {
      console.warn("[notifyJobTaken] send failed:", e?.message);
      return { skipped: true, reason: "send failed" };
    }
  });
