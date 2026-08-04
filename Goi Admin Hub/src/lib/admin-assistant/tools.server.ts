import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- READ TOOLS ----------

const searchCouriers = tool({
  description:
    "חיפוש שליחים במערכת לפי עיר בסיס, אזורי עבודה, סטטוס, סוג רכב, או טקסט חופשי (שם/טלפון). מחזיר רשימה + ספירה כוללת.",
  inputSchema: z.object({
    query: z.string().optional().describe("טקסט חופשי לחיפוש בשם או טלפון"),
    base_city: z.string().optional(),
    working_area: z.string().optional().describe("עיר/אזור בו השליח מוכן לעבוד"),
    status: z.enum(["נרשם", "ממתין לאישור", "פעיל", "חסום", "חסר פרטים"]).optional(),
    vehicle_type: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  execute: async ({ query, base_city, working_area, status, vehicle_type, limit }) => {
    let q = supabaseAdmin
      .from("couriers")
      .select("id, full_name, whatsapp_phone, base_city, working_areas, vehicle_type, courier_status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("courier_status", status);
    if (base_city) q = q.ilike("base_city", `%${base_city}%`);
    if (vehicle_type) q = q.eq("vehicle_type", vehicle_type as never);
    if (working_area) q = q.contains("working_areas", [working_area]);
    if (query) q = q.or(`full_name.ilike.%${query}%,whatsapp_phone.ilike.%${query}%`);
    const { data, error, count } = await q;
    if (error) return { error: error.message };
    return { total: count ?? data?.length ?? 0, couriers: data ?? [] };
  },
});

const getCourier = tool({
  description: "פרטים מלאים של שליח לפי ID, כולל סטטיסטיקות עבודה.",
  inputSchema: z.object({ id: z.string().uuid() }),
  execute: async ({ id }) => {
    const { data: c, error } = await supabaseAdmin.from("couriers").select("*").eq("id", id).maybeSingle();
    if (error) return { error: error.message };
    if (!c) return { error: "שליח לא נמצא" };
    const { data: stats } = await supabaseAdmin.from("courier_stats").select("*").eq("courier_id", id).maybeSingle();
    return { courier: c, stats };
  },
});

const searchBusinesses = tool({
  description: "חיפוש עסקים/מזמינים (customers) לפי שם או טלפון.",
  inputSchema: z.object({
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  execute: async ({ query, limit }) => {
    let q = supabaseAdmin
      .from("customers")
      .select("id, business_name, contact_name, phone, city, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (query) q = q.or(`business_name.ilike.%${query}%,contact_name.ilike.%${query}%,phone.ilike.%${query}%`);
    const { data, error, count } = await q;
    if (error) return { error: error.message };
    return { total: count ?? data?.length ?? 0, businesses: data ?? [] };
  },
});

const searchJobs = tool({
  description: "חיפוש משלוחים לפי סטטוס/תאריך/עסק/שליח.",
  inputSchema: z.object({
    status: z.string().optional(),
    business_id: z.string().uuid().optional(),
    courier_id: z.string().uuid().optional(),
    since_days: z.number().int().min(1).max(365).optional().describe("רק משלוחים מ-X ימים אחורה"),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  execute: async ({ status, business_id, courier_id, since_days, limit }) => {
    let q = supabaseAdmin
      .from("jobs")
      .select("id, status, pickup_area, dropoff_area, customer_price, customer_id, selected_courier_id, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status as never);
    if (business_id) q = q.eq("customer_id", business_id);
    if (courier_id) q = q.eq("selected_courier_id", courier_id);
    if (since_days) {
      const since = new Date(Date.now() - since_days * 86400000).toISOString();
      q = q.gte("created_at", since);
    }
    const { data, error, count } = await q;
    if (error) return { error: error.message };
    return { total: count ?? data?.length ?? 0, jobs: data ?? [] };
  },
});

const systemOverview = tool({
  description: "סקירה כללית של המערכת: כמה שליחים פעילים/ממתינים, כמה משלוחים פתוחים, כמה עסקים, פילוח לפי עיר.",
  inputSchema: z.object({}),
  execute: async () => {
    const [couriers, jobs, businesses] = await Promise.all([
      supabaseAdmin.from("couriers").select("courier_status, base_city"),
      supabaseAdmin.from("jobs").select("status"),
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
    ]);
    const byStatus: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    (couriers.data ?? []).forEach((c: { courier_status: string; base_city: string | null }) => {
      byStatus[c.courier_status] = (byStatus[c.courier_status] ?? 0) + 1;
      if (c.base_city) byCity[c.base_city] = (byCity[c.base_city] ?? 0) + 1;
    });
    const jobsByStatus: Record<string, number> = {};
    (jobs.data ?? []).forEach((j: { status: string }) => {
      jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1;
    });
    const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      couriers_total: couriers.data?.length ?? 0,
      couriers_by_status: byStatus,
      top_cities: topCities.map(([city, count]) => ({ city, count })),
      jobs_by_status: jobsByStatus,
      businesses_total: businesses.count ?? 0,
    };
  },
});

// ---------- ACTION TOOLS (needsApproval) ----------

const updateCourierStatus = tool({
  description: "שינוי סטטוס שליח (פעיל / חסום / חסר פרטים / ממתין לאישור).",
  inputSchema: z.object({
    courier_id: z.string().uuid(),
    new_status: z.enum(["נרשם", "ממתין לאישור", "פעיל", "חסום", "חסר פרטים"]),
  }),
  needsApproval: true,
  execute: async ({ courier_id, new_status }) => {
    const { data, error } = await supabaseAdmin
      .from("couriers")
      .update({ courier_status: new_status })
      .eq("id", courier_id)
      .select("id, full_name, courier_status")
      .maybeSingle();
    if (error) return { error: error.message };
    return { ok: true, courier: data };
  },
});

const addCourierNote = tool({
  description: "הוספת הערה (עם חותמת זמן) לשליח. ההערה נוספת בסוף ההערות הקיימות.",
  inputSchema: z.object({ courier_id: z.string().uuid(), note: z.string().min(1) }),
  needsApproval: true,
  execute: async ({ courier_id, note }) => {
    const { data: current } = await supabaseAdmin.from("couriers").select("notes").eq("id", courier_id).maybeSingle();
    const stamp = new Date().toLocaleString("he-IL");
    const merged = current?.notes ? `${current.notes}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`;
    const { error } = await supabaseAdmin.from("couriers").update({ notes: merged }).eq("id", courier_id);
    if (error) return { error: error.message };
    return { ok: true };
  },
});

const sendWhatsappToCouriers = tool({
  description:
    "יצירת קישורי wa.me להמוני שליחים לפי סינון. מחזיר רשימת {name, phone, link}. המנהל יפתח כל קישור או יעתיק. ההודעה תהיה מוטמעת בקישור.",
  inputSchema: z.object({
    message: z.string().min(1).describe("ההודעה לשליחה (עברית)"),
    base_city: z.string().optional(),
    working_area: z.string().optional(),
    status: z.enum(["נרשם", "ממתין לאישור", "פעיל", "חסום", "חסר פרטים"]).optional(),
    courier_ids: z.array(z.string().uuid()).optional().describe("רשימת ID ספציפיים, עוקף סינונים"),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  needsApproval: true,
  execute: async ({ message, base_city, working_area, status, courier_ids, limit }) => {
    let q = supabaseAdmin.from("couriers").select("id, full_name, whatsapp_phone").limit(limit);
    if (courier_ids?.length) {
      q = q.in("id", courier_ids);
    } else {
      if (status) q = q.eq("courier_status", status);
      if (base_city) q = q.ilike("base_city", `%${base_city}%`);
      if (working_area) q = q.contains("working_areas", [working_area]);
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    const encoded = encodeURIComponent(message);
    const links = (data ?? []).map((c: { id: string; full_name: string; whatsapp_phone: string }) => {
      const p = c.whatsapp_phone.replace(/\D/g, "").replace(/^0/, "972");
      return { id: c.id, name: c.full_name, phone: c.whatsapp_phone, link: `https://wa.me/${p}?text=${encoded}` };
    });
    return { count: links.length, message, links };
  },
});

const updateJobStatus = tool({
  description: "שינוי סטטוס משלוח.",
  inputSchema: z.object({ job_id: z.string().uuid(), new_status: z.string() }),
  needsApproval: true,
  execute: async ({ job_id, new_status }) => {
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update({ status: new_status as never })
      .eq("id", job_id)
      .select("id, status")
      .maybeSingle();
    if (error) return { error: error.message };
    return { ok: true, job: data };
  },
});

const assignCourierToJob = tool({
  description: "שיוך שליח למשלוח.",
  inputSchema: z.object({ job_id: z.string().uuid(), courier_id: z.string().uuid() }),
  needsApproval: true,
  execute: async ({ job_id, courier_id }) => {
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update({ selected_courier_id: courier_id })
      .eq("id", job_id)
      .select("id, selected_courier_id, status")
      .maybeSingle();
    if (error) return { error: error.message };
    return { ok: true, job: data };
  },
});

export const adminAssistantTools = {
  search_couriers: searchCouriers,
  get_courier: getCourier,
  search_businesses: searchBusinesses,
  search_jobs: searchJobs,
  system_overview: systemOverview,
  update_courier_status: updateCourierStatus,
  add_courier_note: addCourierNote,
  send_whatsapp_to_couriers: sendWhatsappToCouriers,
  update_job_status: updateJobStatus,
  assign_courier_to_job: assignCourierToJob,
};

export const ADMIN_ASSISTANT_SYSTEM_PROMPT = `אתה "ג'וי" - העוזר האישי החכם של המנהל במערכת Goi (משלוחים בישראל).

המערכת מנהלת שליחים, עסקים (לקוחות עסקיים), ומשלוחים (jobs). יש לך גישה מלאה לקריאת כל המידע ולביצוע פעולות מסוימות.

עקרונות:
- ענה תמיד בעברית, בטון ידידותי אך מקצועי.
- כשמבקשים נתון/חיפוש - השתמש בכלי קריאה (search_couriers, system_overview וכו') ואל תמציא.
- כשמבקשים פעולה (עדכון/שליחה) - השתמש בכלי הפעולה. הם דורשים אישור מהמנהל לפני ביצוע, וזה נכון - אל תפחד להפעיל אותם.
- הצג תוצאות ארוכות בטבלאות markdown נקיות (| עמודה | עמודה |).
- כש"שלח וואטסאפ ל...", השתמש ב-send_whatsapp_to_couriers עם הסינון המתאים והודעה ברורה.
- שמות סטטוס שליחים: "נרשם", "ממתין לאישור", "פעיל", "חסום", "חסר פרטים".
- כשלא בטוח מה המנהל רוצה - שאל הבהרה קצרה.
- אל תחשוף מזהי UUID אלא אם נשאלת ספציפית.`;
