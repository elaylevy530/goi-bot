import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { supabase } from "@/integrations/supabase/client";
import { getCategory, SERVICE_TYPE_LABELS } from "@/config/businessCategories";
import {
  Activity, Plus, MapPin, Clock, Wallet, Users, Bookmark,
  Repeat, ArrowLeft, TrendingUp, Package, CheckCircle2,
  Building2, Tag, type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/business/dashboard")({
  head: () => ({ meta: [{ title: "האזור העסקי — Goi" }] }),
  ssr: false,
  component: BusinessDashboard,
});

// Kept as an export so other business.* pages can still import EmptyState from here.
export function EmptyState({ icon: Icon, title, desc, action, ctaLabel, ctaTo }: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto size-16 rounded-2xl bg-[#35AD29]/15 grid place-items-center mb-4">
        <Icon className="size-7 text-[#101418]" />
      </div>
      <div className="font-black text-[#101418]">{title}</div>
      {desc && <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
      {ctaLabel && ctaTo && (
        <div className="mt-4">
          <Link
            to={ctaTo as never}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-[#35AD29] text-[#101418] font-black shadow-[0_8px_24px_-8px_rgba(53,173,41,0.35)]"
          >
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  "טיוטה": "bg-black/5 text-[#101418]/70",
  "נשלחה לשליחים": "bg-[#E4F0FF] text-[#0B5FCC]",
  "ממתינה לתגובות": "bg-[#E4F0FF] text-[#0B5FCC]",
  "יש שליחים שאישרו": "bg-[#F1E7FF] text-[#5B21B6]",
  "נבחר שליח": "bg-[#F1E7FF] text-[#5B21B6]",
  "פעילה": "bg-[#FFF3D6] text-[#8A6100]",
  "הושלמה": "bg-[#E6F7EF] text-[#0E7A4A]",
  "בוטלה": "bg-red-50 text-red-700",
};

function BusinessDashboard() {
  const { data: me } = useMyBusiness();

  const { data: orders } = useQuery({
    queryKey: ["biz-dashboard-orders", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase.from("jobs")
        .select("id, status, pickup_address, dropoff_address, created_at, customer_price")
        .eq("customer_id", me!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: walletBalance = 0 } = useQuery({
    queryKey: ["biz-wallet-balance", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions" as never)
        .select("amount").eq("business_id", me!.id);
      return (data ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount || 0), 0);
    },
  });

  const all = orders ?? [];
  const active = all.filter((o) => !["הושלמה", "בוטלה"].includes(o.status));
  const completed = all.filter((o) => o.status === "הושלמה");
  const now = new Date();
  const todayOrders = all.filter((o) => {
    const d = new Date(o.created_at);
    return d.toDateString() === now.toDateString();
  });
  const spentThisMonth = completed
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, o) => s + Number(o.customer_price ?? 0), 0);

  const displayName = (me as { business_name?: string; name?: string } | null)?.business_name || (me as { name?: string } | null)?.name || "העסק שלי";
  const categoryKey = (me as { business_category?: string } | null)?.business_category ?? null;
  const category = getCategory(categoryKey);
  const svc = SERVICE_TYPE_LABELS[category.serviceType];
  const hasCategory = !!categoryKey;

  return (
    <BusinessShell>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-6">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white p-6 relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 size-40 rounded-full bg-[#35AD29]/10 blur-2xl" />
          <div className="relative">
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Building2 className="size-3.5" /> Goi · פאנל עסקים
            </div>
            <h2 className="text-2xl font-black leading-tight">{displayName}</h2>
            <p className="text-sm text-white/70 mt-1">מרכז השליטה שלך במשלוחים</p>

            {/* Category badge (read-only — chosen at signup) */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/10 px-3 py-1.5 text-[12px] text-white">
              <Tag className="size-3.5 text-[#35AD29]" />
              {hasCategory ? (
                <>
                  <span className="font-bold">{category.emoji} {category.label}</span>
                  <span className="text-white/50">·</span>
                  <span className="text-white/70">{svc.emoji} {svc.label}</span>
                </>
              ) : (
                <span className="font-bold text-white/70">לא הוגדרה קטגוריה</span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatChip label="פעילים" value={active.length} icon={Package} />
              <StatChip label="היום" value={todayOrders.length} icon={Activity} />
              <StatChip label="החודש" value={`₪${spentThisMonth.toLocaleString("he-IL")}`} icon={TrendingUp} small />
            </div>

            <Link
              to="/business/new-delivery"
              className="mt-5 inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#35AD29] text-[#101418] font-black text-[15px] shadow-[0_8px_24px_-8px_rgba(53,173,41,0.4)] active:scale-[0.98] transition"
            >
              <Plus className="size-5" /> שדר משלוח חדש
            </Link>
          </div>
        </section>

        {/* Active deliveries */}
        <section>
          <SectionHeader
            title="משלוחים פעילים"
            action={
              active.length > 0 && (
                <Link to="/business/orders" className="text-xs font-bold text-[#101418]/70 hover:text-[#101418] flex items-center gap-1">
                  לכולם <ArrowLeft className="size-3" />
                </Link>
              )
            }
          />
          <div className="mt-3 space-y-2">
            {active.length === 0 ? (
              <div className="rounded-2xl bg-white border border-black/5 p-6 text-center">
                <div className="mx-auto size-12 rounded-2xl bg-[#35AD29]/15 grid place-items-center mb-3">
                  <Package className="size-5 text-[#101418]" />
                </div>
                <div className="text-sm font-bold text-[#101418]">אין משלוחים פעילים</div>
                <div className="text-xs text-slate-500 mt-1">שדר משלוח חדש כדי להתחיל</div>
              </div>
            ) : (
              active.slice(0, 3).map((o) => (
                <Link
                  key={o.id}
                  to="/business/order/$id"
                  params={{ id: o.id }}
                  className="block rounded-2xl bg-white border border-black/5 p-4 hover:border-black/10 transition"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className={`text-[11px] font-black px-2 py-1 rounded-full ${STATUS_STYLES[o.status] ?? "bg-black/5"}`}>
                      {o.status}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="size-3" /> {new Date(o.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#101418] flex items-start gap-1.5">
                    <MapPin className="size-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span className="truncate">{o.pickup_address || "—"}</span>
                  </div>
                  <div className="text-[13px] text-[#101418] flex items-start gap-1.5 mt-1">
                    <MapPin className="size-3.5 mt-0.5 shrink-0 text-[#35AD29]" />
                    <span className="truncate">{o.dropoff_address || "—"}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Quick access grid */}
        <section>
          <SectionHeader title="גישה מהירה" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <QuickCard to="/business/contacts" icon={Bookmark} title="אנשי קשר" desc="נמענים חוזרים" />
            <QuickCard to="/business/addresses" icon={MapPin} title="כתובות שמורות" desc="סניפים ומחסנים" />
            <QuickCard to="/business/recurring-orders" icon={Repeat} title="משלוחים חוזרים" desc="קווי חלוקה" />
            <QuickCard to="/business/team" icon={Users} title="צוות והרשאות" desc="חברי צוות" />
          </div>
        </section>

        {/* Money + insights */}
        <section>
          <SectionHeader title="כספים" />
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Link
              to="/business/wallet"
              className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-black/5 p-4 hover:border-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-[#101418] grid place-items-center">
                  <Wallet className="size-5 text-[#35AD29]" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold">יתרת ארנק</div>
                  <div className="text-lg font-black text-[#101418]">₪{Number(walletBalance).toLocaleString("he-IL")}</div>
                </div>
              </div>
              <ArrowLeft className="size-4 text-slate-400" />
            </Link>
            <Link
              to="/business/billing"
              className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-black/5 p-4 hover:border-black/10"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-[#35AD29]/15 grid place-items-center">
                  <CheckCircle2 className="size-5 text-[#101418]" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold">חשבוניות וחיובים</div>
                  <div className="text-sm font-black text-[#101418]">מצב חיוב חודשי</div>
                </div>
              </div>
              <ArrowLeft className="size-4 text-slate-400" />
            </Link>
          </div>
        </section>
      </div>
    </BusinessShell>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[15px] font-black text-[#101418]">{title}</h3>
      {action}
    </div>
  );
}

function StatChip({ label, value, icon: Icon, small }: { label: string; value: string | number; icon: LucideIcon; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-3">
      <Icon className="size-3.5 text-[#35AD29]" />
      <div className={`font-black text-white mt-1 ${small ? "text-sm" : "text-lg"}`}>{value}</div>
      <div className="text-[10px] text-white/60 font-semibold">{label}</div>
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      to={to as never}
      className="rounded-2xl bg-white border border-black/5 p-4 hover:border-black/10 transition group"
    >
      <div className="size-10 rounded-xl bg-[#35AD29]/15 grid place-items-center mb-3 group-hover:bg-[#35AD29]/25 transition">
        <Icon className="size-5 text-[#101418]" />
      </div>
      <div className="text-sm font-black text-[#101418]">{title}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
    </Link>
  );
}
