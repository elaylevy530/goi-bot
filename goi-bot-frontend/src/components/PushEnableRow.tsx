import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, CheckCircle2, ChevronDown, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { enablePushForCourier, ensurePushSubscriptionFresh, pushSubscriptionStatus, pushSupported } from "@/lib/push/subscribe";
import { enablePushForBusiness, enablePushForCustomer } from "@/lib/push/subscribe-more";

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function AndroidChannelHelp() {
  const [open, setOpen] = useState(false);
  if (!isAndroid()) return null;
  return (
    <div dir="rtl" className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-right hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Smartphone className="size-4 text-slate-600 shrink-0" />
          <span className="text-[12px] font-bold text-slate-800">התראות לא קופצות על המסך? הגדר חשיבות "דחוף" באנדרואיד</span>
        </div>
        <ChevronDown className={`size-4 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="px-4 pb-3 pt-1 text-[12px] text-slate-700 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>פתח <b>הגדרות</b> באנדרואיד ← <b>אפליקציות</b>.</li>
          <li>בחר <b>Chrome</b> (או "Goi" אם התקנת כאפליקציה מסך הבית).</li>
          <li>גע ב־<b>התראות</b> ואתר את הערוץ של Goi (או קטגוריית האתר).</li>
          <li>שנה את החשיבות ל־<b>"דחוף"</b> / <b>"High"</b> — כך ההתראה תקפוץ על המסך עם סאונד ורטט.</li>
          <li>ודא ש<b>"נא לא להפריע"</b> כבוי (או הוסף את Goi לחריגים).</li>
        </ol>
      )}
    </div>
  );
}

/**
 * Single-row "Enable push notifications" CTA for the courier dashboard.
 * Hidden in unsupported environments (Lovable preview, iframes, browsers
 * without PushManager). Once granted, shows a passive confirmation.
 */
export function PushEnableRow({ courierId }: { courierId: string }) {
  return <PushEnableRowGeneric role="courier" ownerId={courierId} />;
}

/**
 * Generic push-enable row for any role. `role="courier"` behaves exactly like
 * the original component; `business` and `customer` write to their own
 * subscription tables. Used so business / private customer users can also
 * receive push notifications when they get a new chat message.
 */
export function PushEnableRowGeneric({
  role,
  ownerId,
  copy,
}: {
  role: "courier" | "business" | "customer";
  ownerId: string;
  copy?: { title?: string; subtitle?: string; grantedTitle?: string; grantedSubtitle?: string };
}) {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushSubscriptionStatus().then((s) => {
      setStatus(s);
      if (s === "granted" && role === "courier") {
        ensurePushSubscriptionFresh(ownerId).catch(() => {});
      }
    });
  }, [ownerId, role]);

  if (!pushSupported() || status === "unsupported") return null;

  const enable = async () => {
    setBusy(true);
    const res =
      role === "courier"
        ? await enablePushForCourier(ownerId)
        : role === "business"
          ? await enablePushForBusiness(ownerId)
          : await enablePushForCustomer(ownerId);
    setBusy(false);
    if (res.ok) {
      toast.success("התראות Push הופעלו — תקבל התראות גם כשהאפליקציה סגורה");
      setStatus("granted");
    } else if (res.reason === "denied") {
      toast.error("ההרשאה נדחתה — אפשר להפעיל מהגדרות הדפדפן/אפליקציה");
      setStatus("denied");
    } else if (res.reason === "preview") {
      toast("Push פעיל רק באפליקציה המפורסמת (לא בתצוגה מקדימה)");
    } else {
      toast.error("לא הצלחנו להפעיל Push — נסה שוב מאוחר יותר");
    }
  };

  if (status === "granted") {
    return (
      <div>
        <div dir="rtl" className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="font-semibold">{copy?.grantedTitle ?? "התראות Push פעילות"}</span>
          <span className="text-emerald-700">— {copy?.grantedSubtitle ?? "תקבל התראה על הודעות ומשלוחים גם כשהאפליקציה ברקע"}</span>
        </div>
        <AndroidChannelHelp />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        dir="rtl"
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-right hover:bg-amber-100 disabled:opacity-60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {status === "denied" ? (
            <BellOff className="size-4 text-amber-700 shrink-0" />
          ) : (
            <Bell className="size-4 text-amber-700 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-amber-900 truncate">
              {status === "denied" ? "הרשאת התראות נדחתה" : copy?.title ?? "הפעל התראות Push"}
            </div>
            <div className="text-[10.5px] text-amber-700 truncate">
              {status === "denied"
                ? "פתח הגדרות אתר/אפליקציה ואפשר התראות"
                : copy?.subtitle ?? "כדי לקבל התראות על הודעות ומשלוחים גם כשהמסך כבוי"}
            </div>
          </div>
        </div>
        {busy ? (
          <Loader2 className="size-4 animate-spin text-amber-700 shrink-0" />
        ) : (
          <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 h-8 shrink-0" asChild>
            <span>{status === "denied" ? "נסה שוב" : "הפעל"}</span>
          </Button>
        )}
      </button>
      {status === "denied" && <AndroidChannelHelp />}
    </div>
  );
}
