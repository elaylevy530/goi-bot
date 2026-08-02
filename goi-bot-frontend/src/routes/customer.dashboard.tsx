import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomerOrders } from "@/lib/use-customer-orders";
import { useGuestSession } from "@/lib/guest-session";
import { PackageCheck, ArrowLeft, MapPin, Clock, Sparkles, Wallet, TrendingUp, Gift, Zap, UserPlus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/customer/dashboard")({
  head: () => ({ meta: [{ title: "האזור שלי — Goi" }] }),
  component: CustomerDashboard,
});


const STATUS_STYLES: Record<string, string> = {
  "טיוטה": "bg-black/5 text-[#101418]/70",
  "נשלחה לשליחים": "bg-[#E4F0FF] text-[#0B5FCC]",
  "נבחר שליח": "bg-[#F1E7FF] text-[#5B21B6]",
  "פעילה": "bg-[#FFF3D6] text-[#8A6100]",
  "הושלמה": "bg-[#E6F7EF] text-[#0E7A4A]",
  "בוטלה": "bg-red-50 text-red-700",
};

function CustomerDashboard() {
  const qc = useQueryClient();
  const { orders, isLoading, isGuest } = useCustomerOrders();
  const { identity } = useGuestSession();

  useEffect(() => {
    const timer = window.setInterval(() => qc.invalidateQueries({ queryKey: ["my-orders"] }), 30_000);
    return () => window.clearInterval(timer);
  }, [qc]);

  const all = (orders ?? []) as unknown as OrderRow[];
  const active = all.filter((o) => !["הושלמה", "בוטלה"].includes(o.status));
  const completed = all.filter((o) => o.status === "הושלמה");
  const recent = all.slice(0, 5);
  const totalSpent = completed.reduce((s, o) => s + Number(o.customer_price ?? 0), 0);
  const now = new Date();
  const spentThisMonth = completed
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, o) => s + Number(o.customer_price ?? 0), 0);
  const lastCompletedAt = completed[0]?.created_at;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-6">
      {/* Hero greeting */}
      <section className="rounded-3xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-6 relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-[#F5C518]/10 blur-2xl" />
        <div className="relative">
          <div className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Goi Express
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">
            {identity?.full_name ? `שלום, ${identity.full_name.split(" ")[0]}` : "שלום, ברוך הבא"}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {isGuest
              ? all.length > 0
                ? "ההזמנות שלך נשמרות במכשיר הזה. אפשר להזמין בלי הרשמה."
                : "אפשר להזמין הובלה תוך דקה — בלי הרשמה, בלי חיכוך."
              : completed.length > 0
                ? `ביצעת ${completed.length} הובלות איתנו. תודה שאתה לקוח שלנו!`
                : "כאן תראה את הפעילות שלך, ההוצאות וההובלות האחרונות."}
          </p>
        </div>
      </section>

      {/* Stats — spent + delivered + active */}
      <section className="grid grid-cols-3 gap-2.5">
        <StatCard
          icon={Wallet}
          label="הוצאת סה״כ"
          value={`₪${totalSpent.toFixed(0)}`}
          accent="bg-[#E6F7EF] text-[#0E7A4A]"
        />
        <StatCard
          icon={PackageCheck}
          label="משלוחים"
          value={String(completed.length)}
          accent="bg-[#E4F0FF] text-[#0B5FCC]"
        />
        <StatCard
          icon={TrendingUp}
          label="החודש"
          value={`₪${spentThisMonth.toFixed(0)}`}
          accent="bg-[#FFF3D6] text-[#8A6100]"
        />
      </section>

      {isGuest && (
        <section className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-[#E6F7EF] grid place-items-center shrink-0">
              <ShieldCheck className="size-5 text-[#0E7A4A]" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black leading-tight">אתה מזמין כאורח</div>
              <div className="text-xs text-[#101418]/65 mt-0.5">
                ההזמנות והמעקב זמינים במכשיר הזה. פתיחת חשבון שומרת הכל גם בהמשך.
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Link to="/customer/new-order" search={{ service: "small_move" as const }}
              className="flex-1 text-center rounded-xl bg-[#101418] text-white text-xs font-extrabold py-2.5">
              הזמנה כאורח
            </Link>
            <Link to="/auth"
              className="flex-1 text-center rounded-xl bg-[#F5C518] text-[#101418] text-xs font-extrabold py-2.5 inline-flex items-center justify-center gap-1.5">
              <UserPlus className="size-3.5" /> פתיחת חשבון
            </Link>
          </div>
        </section>
      )}

      {/* Promo / value banner */}
      <section className="rounded-2xl bg-gradient-to-l from-[#F5C518] to-[#f7d64c] p-4 flex items-center gap-3 ring-1 ring-[#F5C518]/40">
        <div className="size-11 rounded-2xl bg-[#101418] grid place-items-center shrink-0">
          <Gift className="size-5 text-[#F5C518]" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-[#101418] leading-tight">חבר מביא חבר</div>
          <div className="text-xs text-[#101418]/75 mt-0.5">שתף חבר וקבל ₪20 זיכוי במשלוח הבא</div>
        </div>
        <Link to="/customer/profile" className="text-xs font-black text-[#101418] bg-white/70 rounded-xl px-3 py-1.5 hover:bg-white transition shrink-0">
          שתף
        </Link>
      </section>

      {/* Fast tip — how it works */}
      {completed.length === 0 && active.length === 0 && (
        <section className="rounded-2xl bg-white ring-1 ring-black/5 p-4 flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#F1E7FF] text-[#5B21B6] grid place-items-center shrink-0">
            <Zap className="size-5" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">מוביל בלחיצה אחת</div>
            <div className="text-xs text-[#101418]/60 mt-0.5">לחץ "הזמנה" בסרגל התחתון, בחר שירות ומיקום — ואנחנו נמצא לך מוביל בשניות.</div>
          </div>
        </section>
      )}

      {lastCompletedAt && (
        <section className="rounded-2xl bg-white ring-1 ring-black/5 p-4 flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#E6F7EF] text-[#0E7A4A] grid place-items-center shrink-0">
            <Clock className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#101418]/55">המשלוח האחרון שלך</div>
            <div className="text-sm font-bold">
              {new Date(lastCompletedAt).toLocaleDateString("he-IL", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
          <Link to="/customer/activity" className="text-xs font-bold text-[#0B5FCC] shrink-0">היסטוריה</Link>
        </section>
      )}

      {/* Active — like a Gett live ride card */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold">בפעילות עכשיו</h2>
            <span className="text-[11px] font-bold text-[#0E7A4A] bg-[#E6F7EF] px-2 py-0.5 rounded-full">
              {active.length} פעילות
            </span>
          </div>
          <div className="space-y-3">
            {active.map((o) => <LiveOrderCard key={o.id} o={o} />)}
          </div>
        </section>
      )}

      {/* Recent */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold">אחרונות</h2>
          <Link to="/customer/activity" className="text-xs font-semibold text-[#101418]/70 hover:text-[#101418] inline-flex items-center gap-1">
            הכל <ArrowLeft className="size-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#101418]/50 ring-1 ring-black/5">טוען…</div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
            <div className="size-14 rounded-full bg-black/5 mx-auto grid place-items-center mb-3">
              <PackageCheck className="size-6 text-[#101418]/40" />
            </div>
            <div className="text-sm text-[#101418]/60">עדיין אין הזמנות</div>
            <div className="text-xs text-[#101418]/40 mt-1">לחץ על כפתור "הזמנה" למטה כדי להתחיל</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((o) => <CompactOrderRow key={o.id} o={o} />)}
          </div>
        )}
      </section>
    </div>
  );
}

type OrderRow = {
  id: string; job_number: string; status: string;
  pickup_address: string | null; dropoff_address: string | null;
  customer_price: number | null; created_at: string;
  recipient_tracking_token: string | null;
};

function LiveOrderCard({ o }: { o: OrderRow }) {
  return (
    <Link to="/customer/order/$id" params={{ id: o.id }} className="block group">
      <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm group-hover:shadow-md transition overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#101418]/50">#{o.job_number}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[o.status] ?? "bg-black/5"}`}>
              {o.status}
            </span>
          </div>
          {o.customer_price ? (
            <div className="font-extrabold text-[15px]">₪{Number(o.customer_price).toFixed(0)}</div>
          ) : null}
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
  const dotColor = color === "emerald" ? "bg-[#0E7A4A]" : "bg-[#DC2626]";
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center pt-1">
        <div className={`size-2.5 rounded-full ${dotColor}`} />
        {!last && <div className="w-px h-4 bg-black/10 my-0.5" />}
      </div>
      <div className="text-sm text-[#101418] truncate flex-1">{label}</div>
    </div>
  );
}

function CompactOrderRow({ o }: { o: OrderRow }) {
  return (
    <Link to="/customer/order/$id" params={{ id: o.id }} className="block group">
      <div className="rounded-xl bg-white ring-1 ring-black/5 p-3 flex items-center gap-3 hover:ring-black/10 transition">
        <div className="size-10 rounded-xl bg-black/5 grid place-items-center shrink-0">
          <MapPin className="size-4 text-[#101418]/60" />
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
          <div className="text-[11px] text-[#101418]/40 mt-0.5 flex items-center gap-1">
            <Clock className="size-3" /> {new Date(o.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {o.customer_price ? (
          <div className="font-extrabold text-sm shrink-0">₪{Number(o.customer_price).toFixed(0)}</div>
        ) : null}
      </div>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-3 flex flex-col items-center text-center gap-1.5">
      <div className={`size-9 rounded-xl ${accent} grid place-items-center`}>
        <Icon className="size-4.5" strokeWidth={2.2} />
      </div>
      <div className="text-[10px] font-bold text-[#101418]/55 uppercase tracking-wide">{label}</div>
      <div className="text-[15px] font-black text-[#101418] leading-none">{value}</div>
    </div>
  );
}
