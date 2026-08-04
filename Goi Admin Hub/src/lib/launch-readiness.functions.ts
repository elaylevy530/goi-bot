/**
 * Launch-readiness checks. Each check returns { status, label, detail, link }.
 * status is READY | WARNING | BLOCKED.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckStatus = "READY" | "WARNING" | "BLOCKED";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  link?: string;
  lastChecked: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const runLaunchReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const checks: Check[] = [];

    // 1. Active pricing rule
    {
      const { data } = await supabaseAdmin.from("pricing_rules").select("id, base_price, price_per_km, minimum_price, platform_fee_percent").eq("is_active", true).maybeSingle();
      checks.push({
        id: "pricing",
        label: "תמחור פעיל",
        status: data ? "READY" : "BLOCKED",
        detail: data
          ? `בסיס ₪${data.base_price} · לק"מ ₪${data.price_per_km} · מינ' ₪${data.minimum_price} · עמלה ${data.platform_fee_percent}%`
          : "אין כלל תמחור פעיל. צרו אחד בעמוד התמחור.",
        link: "/pricing",
        lastChecked: now,
      });
    }

    // 2. Nationwide ordering
    {
      checks.push({
        id: "nationwide-ordering",
        label: "הזמנות מכל האזורים",
        status: "READY",
        detail: "אין חסימת פיילוט בהזמנת משלוחים — עסקים יכולים להזמין מכל עיר/אזור.",
        lastChecked: now,
      });
    }

    // 3. Admin account exists
    {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      checks.push({
        id: "admin-account",
        label: "חשבון אדמין",
        status: (count ?? 0) > 0 ? "READY" : "BLOCKED",
        detail: `${count ?? 0} חשבונות אדמין רשומים`,
        lastChecked: now,
      });
    }

    // 4. WhatsApp provider configuration
    {
      const provider = (process.env.WHATSAPP_PROVIDER || "green").toLowerCase();
      const greenOk = !!(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN);
      const cloudOk = !!(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
      const cloudSecretsComplete = cloudOk && !!process.env.WHATSAPP_CLOUD_APP_SECRET && !!process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
      if (provider === "cloud") {
        checks.push({
          id: "wa-cloud",
          label: "WhatsApp Cloud API",
          status: cloudSecretsComplete ? "READY" : "BLOCKED",
          detail: cloudSecretsComplete
            ? `Cloud API מוגדר ופעיל`
            : `סוד חסר: token=${cloudOk ? "✓" : "✗"} app_secret=${process.env.WHATSAPP_CLOUD_APP_SECRET ? "✓" : "✗"} verify=${process.env.WHATSAPP_CLOUD_VERIFY_TOKEN ? "✓" : "✗"}`,
          link: "/whatsapp-provider",
          lastChecked: now,
        });
      } else {
        checks.push({
          id: "wa-green",
          label: "WhatsApp (Green API)",
          status: greenOk ? "READY" : "BLOCKED",
          detail: greenOk ? "Green API פעיל" : "GREEN_API_INSTANCE_ID / GREEN_API_TOKEN חסרים",
          link: "/whatsapp-provider",
          lastChecked: now,
        });
        // Cloud not yet provider — warning if secrets missing
        checks.push({
          id: "wa-cloud-readiness",
          label: "Meta Cloud API (הכנה לעתיד)",
          status: cloudSecretsComplete ? "READY" : "WARNING",
          detail: cloudSecretsComplete
            ? "כל הסודות מוגדרים — מוכן למעבר ל-cloud"
            : "סודות Meta Cloud עוד לא הוגדרו — לא חוסם השקה",
          link: "/whatsapp-provider",
          lastChecked: now,
        });
      }
    }

    // 5. Recent webhook activity
    {
      const { data } = await supabaseAdmin
        .from("webhook_events")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const greenRecent = await supabaseAdmin
        .from("green_api_webhook_events")
        .select("received_at")
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latest = data?.created_at || greenRecent.data?.received_at;
      const ageHours = latest ? (Date.now() - new Date(latest).getTime()) / 3_600_000 : 9999;
      checks.push({
        id: "webhook-activity",
        label: "פעילות Webhook אחרונה",
        status: ageHours < 24 ? "READY" : ageHours < 72 ? "WARNING" : "BLOCKED",
        detail: latest ? `אירוע אחרון לפני ${ageHours.toFixed(1)} שעות` : "אין אירועי webhook כלל",
        lastChecked: now,
      });
    }

    // 6. Failed notification queue items
    {
      const { count } = await supabaseAdmin
        .from("notification_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "dead");
      checks.push({
        id: "notif-dead",
        label: "התראות שנכשלו סופית",
        status: (count ?? 0) === 0 ? "READY" : (count ?? 0) < 5 ? "WARNING" : "BLOCKED",
        detail: `${count ?? 0} פריטי queue שמוצו בלי הצלחה`,
        lastChecked: now,
      });
    }

    // 7. Couriers ready to receive jobs
    {
      const { count } = await supabaseAdmin
        .from("couriers")
        .select("*", { count: "exact", head: true })
        .eq("courier_status", "פעיל")
        .eq("admin_jobs_blocked", false);
      checks.push({
        id: "courier-pool",
        label: "שליחים פעילים שיכולים לקבל עבודות",
        status: (count ?? 0) > 0 ? "READY" : "BLOCKED",
        detail: `${count ?? 0} שליחים פעילים`,
        link: "/couriers",
        lastChecked: now,
      });
    }

    // 8. VAPID push (non-blocking)
    {
      const vapid = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
      checks.push({
        id: "vapid",
        label: "Push Notifications (VAPID)",
        status: vapid ? "READY" : "WARNING",
        detail: vapid ? "מפתחות VAPID מוגדרים" : "VAPID לא מוגדר — לא חוסם השקה, push כבוי",
        lastChecked: now,
      });
    }

    // 9. Businesses with payment method on file
    {
      const { count } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("payment_method_on_file", true);
      checks.push({
        id: "biz-payment",
        label: "עסקים עם אמצעי תשלום שמור",
        status: (count ?? 0) > 0 ? "READY" : "WARNING",
        detail: `${count ?? 0} עסקים מוכנים לשדר משלוחים`,
        link: "/businesses",
        lastChecked: now,
      });
    }

    // 10. CRON_SECRET configured (notification worker auth)
    {
      const ok = !!process.env.CRON_SECRET && (process.env.CRON_SECRET as string).length >= 16;
      checks.push({
        id: "cron-secret",
        label: "סוד CRON להגנת worker התראות",
        status: ok ? "READY" : "BLOCKED",
        detail: ok ? "CRON_SECRET מוגדר — worker מוגן" : "CRON_SECRET חסר — endpoint התראות חשוף",
        lastChecked: now,
      });
    }

    // 11. Pricing snapshot wiring — recent jobs should have pricing_snapshot
    {
      const { count: recent } = await supabaseAdmin
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
        .eq("pricing_type", "distance_based");
      const { count: snap } = await supabaseAdmin
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
        .eq("pricing_type", "distance_based")
        .not("pricing_snapshot", "is", null);
      const pct = (recent ?? 0) === 0 ? 100 : Math.round(((snap ?? 0) / (recent as number)) * 100);
      checks.push({
        id: "pricing-snapshot",
        label: "snapshot תמחור על משלוחים",
        status: pct >= 95 ? "READY" : pct >= 50 ? "WARNING" : "BLOCKED",
        detail: `${pct}% מהמשלוחים האחרונים (distance_based) עם snapshot`,
        lastChecked: now,
      });
    }

    const blocked = checks.filter((c) => c.status === "BLOCKED").length;
    const warning = checks.filter((c) => c.status === "WARNING").length;
    const ready = checks.filter((c) => c.status === "READY").length;
    const overall: CheckStatus = blocked > 0 ? "BLOCKED" : warning > 0 ? "WARNING" : "READY";

    return { overall, blocked, warning, ready, checks };
  });

