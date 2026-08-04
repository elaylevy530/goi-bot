import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Normalize Israeli phone to digits-only with country code (972...)
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function phoneToEmail(raw: string): string {
  return `${normalizePhone(raw)}@couriers.goi.local`;
}

function randomPassword(len = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

/**
 * Admin: provision an auth account for a courier.
 * Returns the synthetic email + a one-time temp password the admin can share.
 * If the courier already has user_id, just reset the password.
 */
export const provisionCourierAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("רק מנהל יכול להקצות חשבון לשליח");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: courier, error: cErr } = await supabaseAdmin
      .from("couriers")
      .select("id, full_name, whatsapp_phone, user_id")
      .eq("id", data.id)
      .single();
    if (cErr) throw new Error(cErr.message);
    if (!courier.whatsapp_phone) throw new Error("לשליח חסר מספר וואטסאפ");

    const email = phoneToEmail(courier.whatsapp_phone);
    const tempPassword = randomPassword(8);

    let userId = courier.user_id as string | null;

    if (!userId) {
      // try create
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: courier.full_name, role: "courier", courier_id: courier.id },
      });
      if (createErr) {
        // already exists → find and reset
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (!existing) throw new Error(createErr.message);
        userId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: tempPassword });
      } else {
        userId = created.user!.id;
      }

      await supabaseAdmin
        .from("couriers")
        .update({ user_id: userId, last_temp_password: tempPassword, password_set_at: new Date().toISOString() })
        .eq("id", courier.id);
    } else {
      // reset password for existing user
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
      await supabaseAdmin
        .from("couriers")
        .update({ last_temp_password: tempPassword, password_set_at: new Date().toISOString() })
        .eq("id", courier.id);
    }

    // Ensure user_roles row
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId!, role: "courier" as never }, { onConflict: "user_id,role" });

    return { email, tempPassword, login_phone: normalizePhone(courier.whatsapp_phone) };
  });
