import { createServerFn } from "@tanstack/react-start";
import { createHash, randomInt } from "crypto";

export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9) return "972" + digits;
  return digits;
}

/** Both formats a courier's whatsapp_phone might be stored as. */
export function phoneLookupCandidates(normalized: string): string[] {
  if (normalized.startsWith("972")) {
    return [normalized, "0" + normalized.slice(3)];
  }
  return [normalized];
}

function hashCode(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

// Public: send a 6-digit code over WhatsApp.
export const requestCourierPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => {
    if (!input?.phone || typeof input.phone !== "string") {
      throw new Error("Phone required");
    }
    return { phone: input.phone.trim() };
  })
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (phone.length < 10) {
      // Generic response — don't leak whether phone is valid.
      return { ok: true } as const;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Throttle: reject if a code was issued in the last 60 seconds.
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("courier_password_resets")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", sinceIso)
      .limit(1);
    if (recent && recent.length > 0) {
      return { ok: true, throttled: true } as const;
    }

    // Couriers' whatsapp_phone may be stored as local (0xxxxxxxxx) or
    // international (972xxxxxxxxx) format. Look up both.
    const localPhone = phone.startsWith("972") ? "0" + phone.slice(3) : phone;
    const { data: courier } = await supabaseAdmin
      .from("couriers")
      .select("id, full_name, whatsapp_phone")
      .or(`whatsapp_phone.eq.${phone},whatsapp_phone.eq.${localPhone}`)
      .maybeSingle();

    if (!courier) {
      // Generic ok — don't reveal whether the phone is registered.
      return { ok: true } as const;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(code, phone);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("courier_password_resets")
      .insert({ phone, code_hash, expires_at });
    if (insertErr) {
      console.error("courier_password_resets insert failed:", insertErr.message);
      return { ok: false, error: "כשל ביצירת קוד אימות" } as const;
    }

    try {
      const { sendText } = await import("@/lib/green-api.server");
      const greeting = courier.full_name ? `שלום ${courier.full_name},` : "שלום,";
      await sendText(
        phone,
        `${greeting}\nקוד אימות לאיפוס סיסמה ב-Goi: ${code}\nהקוד תקף ל-10 דקות.\nאם לא ביקשת איפוס — אפשר להתעלם מהודעה זו.`,
      );
    } catch (e: any) {
      console.error("WhatsApp send failed:", e?.message ?? e);
      return { ok: false, error: "שליחת ההודעה לוואטסאפ נכשלה. נסה שוב בעוד מספר דקות." } as const;
    }

    return { ok: true } as const;
  });

// Public: verify code + set new password.
export const confirmCourierPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; newPassword: string }) => {
    if (!input?.phone || !input?.code || !input?.newPassword) {
      throw new Error("Missing fields");
    }
    if (typeof input.newPassword !== "string" || input.newPassword.length < 8) {
      throw new Error("הסיסמה חייבת להיות באורך 8 תווים לפחות");
    }
    if (!/^\d{6}$/.test(input.code.trim())) {
      throw new Error("קוד האימות צריך להיות 6 ספרות");
    }
    return {
      phone: input.phone.trim(),
      code: input.code.trim(),
      newPassword: input.newPassword,
    };
  })
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("courier_password_resets")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return { ok: false, error: "קוד אימות לא נמצא. בקש קוד חדש." } as const;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "תוקף הקוד פג. בקש קוד חדש." } as const;
    }
    if ((row.attempts ?? 0) >= 5) {
      // Burn this attempt to force a new code.
      await supabaseAdmin
        .from("courier_password_resets")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      return { ok: false, error: "בוצעו יותר מדי ניסיונות. בקש קוד חדש." } as const;
    }

    const expected = hashCode(data.code, phone);
    if (expected !== row.code_hash) {
      await supabaseAdmin
        .from("courier_password_resets")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false, error: "קוד שגוי." } as const;
    }

    // Find the courier + their user_id.
    const localPhone2 = phone.startsWith("972") ? "0" + phone.slice(3) : phone;
    const { data: courier } = await supabaseAdmin
      .from("couriers")
      .select("id, user_id")
      .or(`whatsapp_phone.eq.${phone},whatsapp_phone.eq.${localPhone2}`)
      .maybeSingle();

    if (!courier?.user_id) {
      return { ok: false, error: "לא נמצא חשבון פעיל לשליח עם מספר זה." } as const;
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(courier.user_id, {
      password: data.newPassword,
    });
    if (updateErr) {
      console.error("updateUserById failed:", updateErr.message);
      return { ok: false, error: "עדכון הסיסמה נכשל. נסה שוב." } as const;
    }

    await supabaseAdmin
      .from("courier_password_resets")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true } as const;
  });
