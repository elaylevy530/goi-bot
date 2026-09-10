import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Radar, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  getGuestJobStatusFn,
  type createGuestOrderFn,
} from "@/lib/guest-order.functions";

export type CreatedOrder = Awaited<ReturnType<typeof createGuestOrderFn>>;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

/** Payment step — card checkout is not connected yet. */
export function PaymentSheet({ created, onBack }: { created: CreatedOrder; onDone: () => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bottom-16 md:bottom-0 flex flex-col bg-slate-100">
      <div className="px-4 pt-3">
        <button onClick={onBack} className="text-sm font-semibold text-slate-500 inline-flex items-center gap-1">
          <ArrowRight className="size-4" /> חזרה
        </button>
      </div>
      <div className="flex-1 flex items-end">
        <div className="w-full bg-white rounded-t-3xl p-5 space-y-5 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.15)]">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">כמעט סיימת</div>
            <h1 className="text-2xl font-extrabold text-slate-900">{created.service_display_name}</h1>
            <div className="text-xs text-slate-500 mt-1">הזמנה #{created.job_number}</div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <Row label="סה״כ להזמנה" value={`₪${created.total_price.toFixed(2)}`} />
            {created.payment_mode === "deposit" && (
              <Row label="במזומן לשליח" value={`₪${(created.total_price - created.amount_to_charge_now).toFixed(2)}`} />
            )}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
              <span className="font-bold text-slate-900">לחיוב עכשיו:</span>
              <span className="text-2xl font-black text-slate-900">₪{created.amount_to_charge_now.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            סליקת כרטיס תחובר בהמשך. ההזמנה נשמרה, אבל התשלום לא בוצע.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Searching / dispatch screen — polls until courier claims job. */
export function SearchingSheet({ created, onFound, onBack }: { created: CreatedOrder; onFound: () => void; onBack: () => void }) {
  const getStatus = useServerFn(getGuestJobStatusFn);
  const { data: status } = useQuery({
    queryKey: ["guest-job-status", created.job_id],
    queryFn: () => getStatus({ data: { job_id: created.job_id, tracking_token: created.tracking_token } }),
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });

  const found = !!status?.found;
  const courier = status?.courier ?? null;
  const matching = status?.matching_couriers_count ?? 0;

  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => onFound(), 1400);
    return () => clearTimeout(t);
  }, [found, onFound]);

  const steps = [
    { label: "בודקים זמינות", done: true },
    { label: "מתאימים סוג רכב", done: true },
    { label: "בודקים דירוגים", done: matching > 0 },
    { label: "מחשבים זמן הגעה", done: found },
  ];

  return (
    <div className="fixed inset-0 bottom-16 md:bottom-0 flex flex-col bg-slate-900 text-white">
      <div className="px-4 pt-3">
        <button onClick={onBack} className="text-sm font-semibold text-white/60 inline-flex items-center gap-1">
          <ArrowRight className="size-4" /> צפייה בהזמנה
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {!found ? (
          <>
            <div className="relative size-40 grid place-items-center mb-8">
              <div className="absolute inset-0 rounded-full bg-sky-400/10 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-sky-400/20 animate-ping [animation-delay:200ms]" />
              <div className="absolute inset-8 rounded-full bg-sky-400/30 animate-ping [animation-delay:400ms]" />
              <div className="relative size-20 rounded-full bg-sky-400 grid place-items-center shadow-2xl">
                <Radar className="size-10 text-slate-900" strokeWidth={2.4} />
              </div>
            </div>
            <h1 className="text-2xl font-black">מחפשים התאמות באזור שלך…</h1>
            <p className="text-white/60 text-sm mt-2 max-w-xs">
              {matching > 0 ? `הצעה נשלחה ל־${matching} ספקים באזור.` : "מפרסמים את ההזמנה שלך."}
            </p>
            <ul className="mt-8 space-y-2 text-right w-full max-w-xs">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                  <span className={`size-5 rounded-full grid place-items-center flex-shrink-0 ${s.done ? "bg-emerald-500" : "bg-white/10"}`}>
                    {s.done ? <CheckCircle2 className="size-4 text-white" /> : <Loader2 className="size-3 animate-spin text-white/60" />}
                  </span>
                  <span className={`text-sm font-semibold ${s.done ? "text-white" : "text-white/60"}`}>{s.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 text-xs text-white/50">
              הזמנה #{created.job_number} · ₪{created.total_price.toFixed(0)}
            </div>
          </>
        ) : (
          <>
            <div className="size-20 rounded-full bg-emerald-500 grid place-items-center shadow-2xl mb-6">
              <CheckCircle2 className="size-10 text-white" strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl font-black">נמצא ספק!</h1>
            {courier?.full_name ? <p className="text-white/80 text-base font-semibold mt-2">{courier.full_name}</p> : null}
            <p className="text-white/60 text-sm mt-1 max-w-xs">מעביר אותך למסך המעקב…</p>
          </>
        )}
      </div>
    </div>
  );
}
