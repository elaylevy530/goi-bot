import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Building2,
  ChevronDown,
  Coins,
  Copy,
  Share2,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { CourierAvatar } from "@/components/CourierAvatar";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/share")({
  head: () => ({ meta: [{ title: "שתף והרוויח — Goi" }] }),
  component: SharePage,
});

type ReferralRow = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  vehicle_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  jobs_completed?: number | null;
  your_profit?: number | null;
  kind?: "courier" | "business";
};

type ReferralPayload = {
  couriers?: ReferralRow[];
  businesses?: ReferralRow[];
  totals?: {
    couriers_registered?: number;
    couriers_active?: number;
    businesses_registered?: number;
    businesses_active?: number;
    profit?: number;
    pending?: number;
  };
};

function referralToken(me?: { id?: string; referral_code?: unknown } | null) {
  const code = typeof me?.referral_code === "string" ? me.referral_code.trim() : "";
  if (code) return code;
  return me?.id?.trim() || "";
}

function money(n: number) {
  return new Intl.NumberFormat("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

async function fetchReferrals(): Promise<ReferralPayload> {
  const token = getNestAccessToken();
  if (!token) return {};
  try {
    return await apiFetch<ReferralPayload>("/api/accounts/couriers/me/referrals", { accessToken: token });
  } catch {
    return {};
  }
}

function SharePage() {
  const { data: me } = useMyCourier();
  const [tab, setTab] = useState<"courier" | "business">("courier");
  const [showAll, setShowAll] = useState(false);
  const [moreOpen, setMoreOpen] = useState(true);
  const token = referralToken(me);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://goi.co.il";
  const link = token ? `${origin}/join?ref=${encodeURIComponent(token)}` : `${origin}/join`;

  const { data } = useQuery({
    queryKey: ["courier-referrals", me?.id],
    enabled: !!me?.id,
    queryFn: fetchReferrals,
  });

  const couriers = data?.couriers ?? [];
  const businesses = data?.businesses ?? [];
  const list = tab === "courier" ? couriers : businesses;
  const visible = showAll ? list : list.slice(0, 4);
  const totals = data?.totals ?? {};

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("הקישור הועתק");
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const shareText = `היי! מצטרפים ל־Goi דרך הקישור שלי ומרוויחים יחד:\n${link}`;
  const share = async (channel?: "wa" | "fb" | "ig") => {
    if (!channel && navigator.share) {
      try {
        await navigator.share({ title: "Goi", text: shareText, url: link });
        return;
      } catch {}
    }
    const encoded = encodeURIComponent(shareText);
    if (channel === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
    else if (channel === "ig") {
      await copy();
      toast.message("הקישור הועתק — הדביקו באינסטגרם");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const stats = useMemo(() => ([
    { icon: Users, value: String((totals.couriers_registered ?? 0) + (totals.businesses_registered ?? 0) || couriers.length + businesses.length), label: "שליחים ועסקים" },
    { icon: Bike, value: String(totals.couriers_active ?? couriers.filter((c) => c.status === "פעיל").length), label: `מתוך ${totals.couriers_registered ?? couriers.length} שנרשמו` },
    { icon: Store, value: String(totals.businesses_active ?? businesses.filter((b) => b.status === "פעיל").length), label: `מתוך ${totals.businesses_registered ?? businesses.length} שנרשמו` },
    { icon: Coins, value: `₪ ${money(Number(totals.profit ?? 0))}`, label: "כל הזמנים" },
    { icon: Wallet, value: `₪ ${money(Number(totals.pending ?? 0))}`, label: "יועבר בקרוב" },
  ]), [totals, couriers, businesses]);

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">שתף והרוויח</h1>
            <div className="size-11 shrink-0" aria-hidden />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <section className="overflow-hidden rounded-card bg-primary-deep p-4 text-primary-foreground shadow-card-strong">
              <p className="text-xl font-black">תרוויח מכל הפניה!</p>
              <p className="mt-1 text-sm text-primary-foreground/80">שתף שליחים ועסקים והרווח על כל פעילות שלהם</p>
              <div className="mt-4 flex items-center gap-2 rounded-card bg-black/20 px-3 py-2">
                <p className="min-w-0 flex-1 truncate text-left text-xs font-semibold" dir="ltr">{link}</p>
                <button type="button" onClick={() => void copy()} className="grid size-10 place-items-center rounded-pill bg-surface text-primary" aria-label="העתק קישור">
                  <Copy className="size-4" />
                </button>
              </div>
              <button type="button" onClick={() => setMoreOpen((v) => !v)} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary-foreground/90">
                עוד אפשרויות לשיתוף
                <ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
              </button>
            </section>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="min-w-[7.5rem] rounded-card border border-border bg-surface p-3 shadow-card">
                    <Icon className="size-4 text-primary" aria-hidden />
                    <p className="mt-2 text-lg font-black tabular-nums text-text-strong">{s.value}</p>
                    <p className="mt-1 text-[11px] text-text-subtle">{s.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTab("courier"); setShowAll(false); }}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-card border text-sm font-extrabold",
                  tab === "courier" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-subtle",
                )}
              >
                <Bike className="size-4" /> שליחים
              </button>
              <button
                type="button"
                onClick={() => { setTab("business"); setShowAll(false); }}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-card border text-sm font-extrabold",
                  tab === "business" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-subtle",
                )}
              >
                <Store className="size-4" /> עסקים
              </button>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-text-strong">
                  {tab === "courier" ? "שליחים שהצטרפו דרכך" : "עסקים שהצטרפו דרכך"}
                </h2>
                {list.length > 4 && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 text-sm font-bold text-primary">
                    {showAll ? "הצג פחות" : "הצג את כולם"}
                  </button>
                )}
              </div>
              {visible.length === 0 ? (
                <p className="rounded-card border border-border bg-surface py-10 text-center text-sm text-text-muted">
                  עדיין אין הצטרפויות דרך הקישור שלך
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visible.map((row) => (
                    <li key={row.id ?? row.full_name} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-3 shadow-card">
                      {tab === "courier" ? (
                        <CourierAvatar path={row.avatar_url} name={row.full_name} size={40} />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-pill bg-primary-soft text-primary">
                          <Building2 className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm font-bold text-text-strong">{row.full_name || "—"}</p>
                        <p className="text-[11px] text-text-muted">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString("he-IL") : ""}
                          {row.jobs_completed != null ? ` · ${row.jobs_completed} משלוחים` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-left">
                        <StatusPill status={row.status} />
                        <p className="mt-1 text-sm font-extrabold tabular-nums text-primary">₪ {money(Number(row.your_profit ?? 0))}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {tab === "courier" && businesses.length > 0 && (
                <div className="flex items-center justify-between rounded-card border border-border bg-muted px-3 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-text-strong">
                    <Store className="size-4 text-primary" />
                    {totals.businesses_active ?? businesses.length} עסקים פעילים
                  </div>
                  <p className="text-sm font-extrabold text-primary">
                    ₪ {money(businesses.reduce((s, b) => s + Number(b.your_profit ?? 0), 0))}
                  </p>
                </div>
              )}
            </section>

            {moreOpen && (
              <section className="space-y-2">
                <h2 className="text-sm font-extrabold text-text-strong">דרכים לשיתוף</h2>
                <div className="flex justify-center gap-3">
                  <ShareCircle label="עוד" onClick={() => void share()} icon={<Share2 className="size-4" />} />
                  <ShareCircle label="אינסטגרם" onClick={() => void share("ig")} icon={<span className="text-[10px] font-black">IG</span>} />
                  <ShareCircle label="פייסבוק" onClick={() => void share("fb")} icon={<span className="text-[10px] font-black">f</span>} />
                  <ShareCircle label="וואטסאפ" onClick={() => void share("wa")} icon={<span className="text-[10px] font-black">WA</span>} />
                  <ShareCircle label="העתק" onClick={() => void copy()} icon={<Copy className="size-4" />} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const s = status || "ממתין";
  const tone = s === "פעיל" ? "bg-success-bg text-success-text" : s.includes("אימות") || s.includes("ממתין") ? "bg-warning-bg text-warning-text" : "bg-danger-bg text-danger-text";
  return <span className={cn("inline-flex rounded-pill px-2 py-0.5 text-[10px] font-bold", tone)}>{s}</span>;
}

function ShareCircle({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-14 flex-col items-center gap-1">
      <span className="grid size-11 place-items-center rounded-pill border border-border bg-surface text-primary shadow-card">{icon}</span>
      <span className="text-[10px] font-semibold text-text-subtle">{label}</span>
    </button>
  );
}
