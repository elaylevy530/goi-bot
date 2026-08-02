import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { cancelMyOrderFn } from "@/lib/customer-account.functions";
import { cancelGuestOrderFn } from "@/lib/guest-order.functions";
import { useCustomerOrders } from "@/lib/use-customer-orders";
import { guestTokenFor } from "@/lib/guest-session";
import { Activity, Clock, MapPin, PackageCheck, Search, Wallet, TrendingUp, Plus, Radar, X, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/customer/activity")({
  head: () => ({ meta: [{ title: "פעילות — Goi" }] }),
  component: ActivityPage,
});

const STATUS_STYLES: Record<string, string> = {
  "טיוטה": "bg-black/5 text-[#101418]/70",
  "נשלחה לשליחים": "bg-[#E4F0FF] text-[#0B5FCC]",
  "נבחר שליח": "bg-[#F1E7FF] text-[#5B21B6]",
  "פעילה": "bg-[#FFF3D6] text-[#8A6100]",
  "הושלמה": "bg-[#E6F7EF] text-[#0E7A4A]",
  "בוטלה": "bg-red-50 text-red-700",
};

type OrderRow = {
  id: string; job_number: string; status: string;
  pickup_address: string | null; dropoff_address: string | null;
  customer_price: number | null; created_at: string;
  recipient_tracking_token: string | null;
  pricing_type?: string | null; selected_courier_id?: string | null;
  quotes_count?: number;
};


function ActivityPage() {
  const qc = useQueryClient();
  const { orders, isLoading, isGuest } = useCustomerOrders();
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => qc.invalidateQueries({ queryKey: ["my-orders"] }), 30_000);
    return () => window.clearInterval(timer);
  }, [qc]);


  const { pending, active, history, stats } = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = (o: OrderRow) => {
      if (!s) return true;
      const hay = `${o.job_number} ${o.pickup_address ?? ""} ${o.dropoff_address ?? ""}`.toLowerCase();
      return hay.includes(s);
    };
    const list = (orders as OrderRow[]).filter(match);
    const openList = list.filter((o) => !["הושלמה", "בוטלה"].includes(o.status));
    // Orders already broadcast but no mover approved / no quote accepted yet
    const pendingList = openList.filter((o) => !o.selected_courier_id);
    const activeList = openList.filter((o) => !!o.selected_courier_id);
    const historyList = list.filter((o) => ["הושלמה", "בוטלה"].includes(o.status));
    const completed = historyList.filter((o) => o.status === "הושלמה");
    const totalSpent = completed.reduce((acc, o) => acc + Number(o.customer_price ?? 0), 0);
    const now = new Date();
    const spentThisMonth = completed
      .filter((o) => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, o) => acc + Number(o.customer_price ?? 0), 0);
    const avg = completed.length ? totalSpent / completed.length : 0;
    return {
      pending: pendingList,
      active: activeList,
      history: historyList,
      stats: { totalSpent, spentThisMonth, avg, completedCount: completed.length },
    };
  }, [orders, q]);


  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-5">
      <div className="flex items-center gap-2">
        <Activity className="size-5" />
        <h1 className="text-xl font-extrabold">הפעילות שלי</h1>
      </div>

      <div className="relative">
        <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#101418]/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חפש לפי מספר הזמנה או כתובת…"
          className="w-full rounded-2xl bg-white ring-1 ring-black/5 pr-9 pl-3 py-2.5 text-sm outline-none focus:ring-black/20"
        />
      </div>

      {isGuest && (
        <Link
          to="/auth"
          className="flex items-center gap-3 rounded-2xl bg-[#101418] text-white p-3.5"
        >
          <div className="size-9 rounded-full bg-[#F5C518]/20 grid place-items-center shrink-0">
            <UserPlus className="size-4 text-[#F5C518]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold">אתה מזמין כאורח</div>
            <div className="text-[11px] text-white/60">פתח חשבון כדי לשמור את ההיסטוריה גם במכשירים אחרים</div>
          </div>
        </Link>
      )}

      {/* Waiting for a mover / quote approval */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-extrabold">ממתינות לאישור הצעה</h2>
            <span className="text-[11px] font-bold text-[#8A6100] bg-[#FFF3D6] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#8A6100] animate-pulse" /> {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((o) => <PendingCard key={o.id} o={o} onChanged={() => qc.invalidateQueries({ queryKey: ["my-orders"] })} />)}
          </div>
          <Link to="/customer/new-order" search={{ service: "same_day" as const }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0B5FCC]">
            <Plus className="size-3.5" /> אפשר לפתוח הזמנה נוספת בזמן ההמתנה
          </Link>
        </section>
      )}

      {/* Active */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-extrabold">פעילות עכשיו</h2>
          {active.length > 0 && (
            <span className="text-[11px] font-bold text-[#0E7A4A] bg-[#E6F7EF] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#0E7A4A] animate-pulse" /> {active.length}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#101418]/50 ring-1 ring-black/5">טוען…</div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
            <div className="text-sm text-[#101418]/60">אין הזמנות בביצוע</div>
            <Link to="/customer/new-order" search={{ service: "same_day" as const }}
              className="inline-block mt-2 text-xs font-bold text-[#0B5FCC]">להזמין עכשיו →</Link>
          </div>
        ) : (
          <div className="space-y-3">{active.map((o) => <ActiveCard key={o.id} o={o} />)}</div>
        )}
      </section>


      {/* Spending summary */}
      {stats.completedCount > 0 && (
        <section className="rounded-2xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">סיכום כספי</div>
          <div className="grid grid-cols-3 gap-3">
            <SpendStat icon={Wallet} label="סה״כ שילמת" value={`₪${stats.totalSpent.toFixed(0)}`} />
            <SpendStat icon={TrendingUp} label="החודש" value={`₪${stats.spentThisMonth.toFixed(0)}`} />
            <SpendStat icon={PackageCheck} label="ממוצע למשלוח" value={`₪${stats.avg.toFixed(0)}`} />
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-extrabold text-[#101418]/70">היסטוריית משלוחים</h2>
          {history.length > 0 && <span className="text-[11px] text-[#101418]/40 font-semibold">{history.length}</span>}
        </div>
        {history.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5 text-sm text-[#101418]/50">
            עדיין אין הזמנות שהושלמו
          </div>
        ) : (
          <div className="space-y-2">{history.map((o) => <HistoryRow key={o.id} o={o} />)}</div>
        )}
      </section>
    </div>
  );
}

function PendingCard({ o, onChanged }: { o: OrderRow; onChanged: () => void }) {
  const cancelOrder = useServerFn(cancelMyOrderFn);
  const cancelGuest = useServerFn(cancelGuestOrderFn);
  const [busy, setBusy] = useState(false);
  const quotes = o.quotes_count ?? 0;
  const isQuoteFlow = o.pricing_type === "quote_request";

  const cancel = async () => {
    if (busy) return;
    if (!window.confirm(`לבטל את הזמנה #${o.job_number}?`)) return;
    setBusy(true);
    try {
      const guestToken = guestTokenFor(o.id);
      if (guestToken) await cancelGuest({ data: { job_id: o.id, tracking_token: guestToken } });
      else await cancelOrder({ data: { id: o.id } });
      toast.success("ההזמנה בוטלה");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "לא הצלחנו לבטל");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#F5C518]/50 shadow-sm overflow-hidden">
      <Link to="/customer/order/$id" params={{ id: o.id }} className="block">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#101418]/50">#{o.job_number}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#FFF3D6] text-[#8A6100] inline-flex items-center gap-1">
              <Radar className="size-3" />
              {isQuoteFlow ? (quotes > 0 ? `${quotes} הצעות ממתינות לך` : "אוספים הצעות ממובילים") : "מחפשים מוביל"}
            </span>
          </div>
          {o.customer_price ? <div className="font-extrabold">₪{Number(o.customer_price).toFixed(0)}</div> : null}
        </div>
        <div className="px-4 pb-3 space-y-2">
          <RoutePin label={o.pickup_address ?? "—"} color="emerald" />
          <RoutePin label={o.dropoff_address ?? "—"} color="rose" last />
        </div>
      </Link>
      <div className="px-4 pb-3 flex items-center gap-2">
        <Link
          to="/customer/order/$id"
          params={{ id: o.id }}
          className="flex-1 text-center rounded-xl bg-[#101418] text-white text-xs font-bold py-2"
        >
          {quotes > 0 ? "צפייה בהצעות ובחירה" : "מעקב אחרי החיפוש"}
        </Link>
        <button
          onClick={cancel}
          disabled={busy}
          className="rounded-xl border border-red-200 text-red-600 text-xs font-bold px-3 py-2 inline-flex items-center gap-1 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          ביטול
        </button>
      </div>
    </div>
  );
}

function ActiveCard({ o }: { o: OrderRow }) {
  return (
    <Link to="/customer/order/$id" params={{ id: o.id }} className="block group">
      <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm group-hover:shadow-md transition overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#101418]/50">#{o.job_number}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[o.status] ?? "bg-black/5"}`}>
              {o.status}
            </span>
          </div>
          {o.customer_price ? <div className="font-extrabold">₪{Number(o.customer_price).toFixed(0)}</div> : null}
        </div>
        <div className="px-4 pb-4 space-y-2">
          <RoutePin label={o.pickup_address ?? "—"} color="emerald" />
          <RoutePin label={o.dropoff_address ?? "—"} color="rose" last />
        </div>
      </div>
    </Link>
  );
}

function RoutePin({ label, color, last }: { label: string; color: "emerald" | "rose"; last?: boolean }) {
  const dot = color === "emerald" ? "bg-[#0E7A4A]" : "bg-[#DC2626]";
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center pt-1">
        <div className={`size-2.5 rounded-full ${dot}`} />
        {!last && <div className="w-px h-4 bg-black/10 my-0.5" />}
      </div>
      <div className="text-sm text-[#101418] truncate flex-1">{label}</div>
    </div>
  );
}

function HistoryRow({ o }: { o: OrderRow }) {
  return (
    <Link to="/customer/order/$id" params={{ id: o.id }} className="block group">
      <div className="rounded-xl bg-white ring-1 ring-black/5 p-3 flex items-center gap-3 hover:ring-black/10 transition">
        <div className="size-10 rounded-xl bg-black/5 grid place-items-center shrink-0">
          {o.status === "הושלמה"
            ? <PackageCheck className="size-4 text-[#0E7A4A]" />
            : <MapPin className="size-4 text-[#101418]/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">#{o.job_number}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_STYLES[o.status] ?? "bg-black/5"}`}>
              {o.status}
            </span>
          </div>
          <div className="text-xs text-[#101418]/60 truncate mt-0.5">
            {o.pickup_address} ← {o.dropoff_address}
          </div>
          <div className="text-[11px] text-[#101418]/40 mt-0.5 inline-flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(o.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {o.customer_price ? <div className="font-extrabold text-sm shrink-0">₪{Number(o.customer_price).toFixed(0)}</div> : null}
      </div>
    </Link>
  );
}

function SpendStat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="size-8 rounded-lg bg-white/10 grid place-items-center">
        <Icon className="size-4 text-[#F5C518]" strokeWidth={2.2} />
      </div>
      <div className="text-[10px] text-white/60 font-semibold">{label}</div>
      <div className="text-sm font-black leading-none">{value}</div>
    </div>
  );
}
