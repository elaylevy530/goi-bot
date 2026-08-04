import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchTagIds, type ClassificationRule } from "./classification";

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

const intakeSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  whatsapp_phone: z.string().trim().regex(phoneRegex),
  id_number: z.string().trim().regex(/^\d{5,12}$/, "מספר ת״ז לא תקין").optional().nullable(),
  id_photo_base64: z.string().max(10_000_000).optional().nullable(),
  id_photo_mime: z.string().max(80).optional().nullable(),
  id_photo_back_base64: z.string().max(10_000_000).optional().nullable(),
  id_photo_back_mime: z.string().max(80).optional().nullable(),
  base_city: z.string().trim().min(1).max(80),
  wanted_work_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_work_area: z.string().trim().max(120).optional().nullable(),
  pickup_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_pickup_area: z.string().trim().max(120).optional().nullable(),
  dropoff_areas: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  custom_dropoff_area: z.string().trim().max(120).optional().nullable(),
  work_distance_from_base: z.string().trim().max(60).optional().nullable(),
  vehicle_types: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  job_types: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  invoice_status: z.enum(["כן", "לא", "תסדרו אותי"]).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  courier_experience_status: z.string().trim().max(60).optional().nullable(),
  courier_experience_duration: z.string().trim().max(60).optional().nullable(),
  consent_whatsapp: z.boolean().default(true),
  password: z.string().min(6).max(72).optional().nullable(),
  courier_kind: z.enum(["courier", "mover"]).default("courier"),
});


function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export type CourierIntakeInput = z.infer<typeof intakeSchema>;

export const registerCourier = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => intakeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Map first vehicle into legacy vehicle_type enum (for backward compat with admin filters)
    const legacyVehicleEnum = ["קטנוע", "רכב", "אופניים חשמליים", "הליכה", "קורקינט חשמלי", "אופניים רגילים"];
    const firstVehicle = data.vehicle_types.find((v) => legacyVehicleEnum.includes(v)) ?? null;

    // job_types is a Postgres enum array — anything outside the enum (mover job kinds,
    // crew size, floors, minimum price) must NOT be sent there or the insert fails.
    const JOB_TYPE_ENUM = [
      "משלוח בודד", "משמרת לפי שעה", "קו חלוקה", "משלוחי אוכל", "חבילות / מסמכים", "אחר",
    ];
    const wantsAll = data.job_types.includes("*");
    const enumJobTypes = wantsAll
      ? JOB_TYPE_ENUM
      : data.job_types.filter((j) => JOB_TYPE_ENUM.includes(j));
    const extraJobDetails = data.job_types.filter((j) => j !== "*" && !JOB_TYPE_ENUM.includes(j));
    const safeJobTypes = enumJobTypes.length
      ? enumJobTypes
      : extraJobDetails.length
        ? ["אחר"]
        : [];

    // 1. Insert courier (status "ממתין לאישור")
    const insertPayload = {
      full_name: data.full_name,
      whatsapp_phone: data.whatsapp_phone,
      base_city: data.base_city,
      invoice_status: data.invoice_status ?? "לא",
      working_areas: data.wanted_work_areas,
      job_types: safeJobTypes,
      preferred_job_types: extraJobDetails,
      availability: [],
      courier_status: "ממתין לאישור",
      lead_source: "טופס /join",
      id_number: data.id_number || null,
      vehicle_type: firstVehicle,
      vehicle_label: data.vehicle_types.join(", ") || null,
      vehicle_types: data.vehicle_types,
      custom_work_area: data.custom_work_area,
      pickup_areas: data.pickup_areas,
      custom_pickup_area: data.custom_pickup_area,
      dropoff_areas: data.dropoff_areas,
      custom_dropoff_area: data.custom_dropoff_area,
      work_distance_from_base: data.work_distance_from_base,
      courier_experience_status: data.courier_experience_status,
      courier_experience_duration: data.courier_experience_duration,
      gender: data.gender,
      consent_whatsapp: data.consent_whatsapp,
      courier_kind: data.courier_kind,
    } as never;


    const { data: courier, error: insErr } = await supabaseAdmin
      .from("couriers")
      .insert(insertPayload)
      .select()
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        throw new Error("מספר וואטסאפ כבר רשום במערכת");
      }
      throw new Error(insErr.message);
    }

    // 1b. Upload ID photos if provided (front + back)
    const courierId = courier.id;
    async function uploadIdPhoto(b64?: string | null, mime?: string | null, side: "front" | "back" = "front") {
      if (!b64 || !mime) return null;
      try {
        const clean = b64.replace(/^data:[^;]+;base64,/, "");
        const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
        const ext = (mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
        const path = `${courierId}/id_${side}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("courier-ids")
          .upload(path, bytes, { contentType: mime, upsert: true });
        if (upErr) return null;
        return path;
      } catch {
        return null;
      }
    }

    const frontPath = await uploadIdPhoto(data.id_photo_base64, data.id_photo_mime, "front");
    const backPath = await uploadIdPhoto(data.id_photo_back_base64, data.id_photo_back_mime, "back");
    if (frontPath || backPath) {
      const update: { id_photo_url?: string; id_photo_back_url?: string } = {};
      if (frontPath) update.id_photo_url = frontPath;
      if (backPath) update.id_photo_back_url = backPath;
      await supabaseAdmin.from("couriers").update(update).eq("id", courierId);
    }

    // 2. Apply classification rules → courier_tags
    const { data: rules } = await supabaseAdmin
      .from("classification_rules")
      .select("id, field, operator, value, tag_id, enabled")
      .eq("enabled", true);

    const tagIds = matchTagIds((rules ?? []) as ClassificationRule[], courier);
    if (tagIds.length) {
      await supabaseAdmin.from("courier_tags").insert(
        tagIds.map((tag_id) => ({
          courier_id: courier.id,
          tag_id,
          assigned_automatically: true,
        })),
      );
    }

    // 3. Queue onboarding WhatsApp message (pending)
    const { data: template } = await supabaseAdmin
      .from("bot_templates")
      .select("id, message_body")
      .eq("template_name", "ברוכים הבאים לשליח")
      .eq("is_active", true)
      .maybeSingle();

    const body = (template?.message_body ?? "שלום {{name}}, נרשמת בהצלחה לרשת השליחים של Goi. נחזור אליך בקרוב.")
      .replace(/\{\{name\}\}/g, courier.full_name)
      .replace(/\{\{phone\}\}/g, courier.whatsapp_phone);

    await supabaseAdmin.from("whatsapp_messages").insert({
      phone: courier.whatsapp_phone,
      courier_id: courier.id,
      template_id: template?.id ?? null,
      direction: "outbound",
      delivery_status: "pending",
      body,
    });

    // 4. Optional: create an auth account for the courier (self-signup with password)
    let accountCreated = false;
    if (data.password) {
      const phoneDigits = normalizePhoneDigits(data.whatsapp_phone);
      const email = `${phoneDigits}@couriers.goi.local`;
      let userId: string | null = null;
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name, role: "courier", courier_id: courier.id },
      });
      if (createErr) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          userId = found.id;
          await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
        }
      } else {
        userId = created.user!.id;
      }
      if (userId) {
        await supabaseAdmin
          .from("couriers")
          .update({ user_id: userId, last_temp_password: data.password, password_set_at: new Date().toISOString() })
          .eq("id", courier.id);
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "courier" as never }, { onConflict: "user_id,role" });
        accountCreated = true;
      }
    }

    return { id: courier.id, tagCount: tagIds.length, accountCreated };
  });

// Admin-side: re-run classification for an existing courier.
export const reclassifyCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: courier, error } = await supabaseAdmin
      .from("couriers")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: rules } = await supabaseAdmin
      .from("classification_rules")
      .select("id, field, operator, value, tag_id, enabled")
      .eq("enabled", true);

    const tagIds = matchTagIds((rules ?? []) as ClassificationRule[], courier);

    // Remove previous auto tags, then re-insert.
    await supabaseAdmin
      .from("courier_tags")
      .delete()
      .eq("courier_id", data.id)
      .eq("assigned_automatically", true);

    if (tagIds.length) {
      await supabaseAdmin.from("courier_tags").insert(
        tagIds.map((tag_id) => ({
          courier_id: data.id,
          tag_id,
          assigned_automatically: true,
        })),
      );
    }
    return { tagCount: tagIds.length };
  });

function normalizeCourierPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9) return "972" + digits;
  return digits;
}

function generateTempPassword(): string {
  // 10 chars, no easily confused symbols, mixed alnum
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// Admin: approve a pending courier → keep him suspended until the admin explicitly activates him,
// link existing auth user (created at signup), and send WhatsApp welcome message. Does NOT reset password.
export const approveCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), suspended: z.boolean().optional() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Always show courier as "פעיל" in their panel. When `suspended` is true we still
    // approve them but flip is_paused=true so they don't actually receive jobs yet.
    const isSuspended = data.suspended === true;
    const { data: courier, error } = await supabaseAdmin
      .from("couriers")
      .update({
        courier_status: "פעיל",
        is_paused: isSuspended,
        paused_at: isSuspended ? new Date().toISOString() : null,
        paused_reason: isSuspended ? "ממתין להפעלה ידנית על ידי מנהל" : null,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);


    const normalizedPhone = normalizeCourierPhone(courier.whatsapp_phone);
    const loginEmail = `${normalizedPhone}@couriers.goi.local`;

    // Make sure the courier row is linked to its auth user and has the courier role.
    // We do NOT touch the password — the courier set it themselves at signup.
    let userId = courier.user_id as string | null;
    try {
      if (!userId) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === loginEmail);
        if (existing) userId = existing.id;
      }
      if (userId) {
        await supabaseAdmin
          .from("couriers")
          .update({ user_id: userId })
          .eq("id", courier.id);
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "courier" }, { onConflict: "user_id,role" });
      }
    } catch (e) {
      console.error("[approveCourier] linking auth user failed:", e);
    }

    // WhatsApp approval message intentionally disabled — approving a courier/mover
    // no longer sends any WhatsApp notification.
    return {
      ok: true,
      whatsappSent: false,
      error: null,
      whatsappInsertError: null,
    };

  });

// Admin: signed URL for the private courier-ids bucket (5 min validity).
export const getIdPhotoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("courier-ids")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });


// Admin: delete a courier (and related rows). Requires admin role.
export const deleteCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("רק מנהל יכול למחוק שליח");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort cleanup of related rows
    await supabaseAdmin.from("courier_tags").delete().eq("courier_id", data.id);
    await supabaseAdmin.from("whatsapp_messages").delete().eq("courier_id", data.id);
    await supabaseAdmin.from("status_logs").delete().eq("entity_type", "courier").eq("entity_id", data.id);

    const { data: courier } = await supabaseAdmin
      .from("couriers")
      .select("id_photo_url")
      .eq("id", data.id)
      .maybeSingle();
    if (courier?.id_photo_url) {
      await supabaseAdmin.storage.from("courier-ids").remove([courier.id_photo_url]);
    }

    const { error } = await supabaseAdmin.from("couriers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
