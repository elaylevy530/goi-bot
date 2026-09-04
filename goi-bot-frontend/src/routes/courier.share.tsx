import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bike,
  Building2,
  ChevronDown,
  Coins,
  Copy,
  Info,
  Share2,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { CourierAvatar } from "@/components/CourierAvatar";
import { CourierBellButton, CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { ScooterIcon } from "@/components/courier/work-area-visuals";
import { ApiClientError } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";
import { nestListMyCourierReferrals } from "@/lib/nest-domain";
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
  commissions?: {
    id?: string;
    job_id?: string;
    kind?: "courier" | "business";
    amount?: number;
    created_at?: string;
  }[];
  commission_ils?: number;
  totals?: {
    couriers_registered?: number;
    couriers_active?: number;
    businesses_registered?: number;
    businesses_active?: number;
    profit?: number;
    pending?: number;
  };
};

function referralCode(me?: { referral_code?: unknown } | null) {
  const code = typeof me?.referral_code === "string" ? me.referral_code.trim() : "";
  return code;
}

function money(n: number) {
  return new Intl.NumberFormat("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function joinDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("he-IL");
}

async function fetchReferrals(): Promise<ReferralPayload> {
  const token = getNestAccessToken();
  if (!token) return {};
  try {
    return await nestListMyCourierReferrals() as ReferralPayload;
  } catch (e) {
    if (e instanceof ApiClientError && (e.status === 401 || e.status === 403)) return {};
    throw e;
  }
}

function SharePage() {
  const { data: me, isPending: mePending } = useMyCourier();
  const [tab, setTab] = useState<"courier" | "business">("courier");
  const [showAll, setShowAll] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const code = referralCode(me);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://goi.co.il";
  const courierLink = code ? `${origin}/join?ref=${encodeURIComponent(code)}` : "";
  const businessLink = code ? `${origin}/signup-business?ref=${encodeURIComponent(code)}` : "";
  const link = courierLink;
  const linkReady = !!code;

  const { data, isError } = useQuery({
    queryKey: ["courier-referrals", me?.id],
    enabled: !!me?.id,
    queryFn: fetchReferrals,
  });

  const couriers = data?.couriers ?? [];
  const businesses = data?.businesses ?? [];
  const list = tab === "courier" ? couriers : businesses;
  const visible = showAll ? list : list.slice(0, 4);
  const totals = data?.totals ?? {};

  const copy = async (value = link) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("הקישור הועתק");
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const shareText = `היי! מצטרפים ל־Goi דרך הקישור שלי ומרוויחים יחד:\n${link}`;
  const share = async (channel?: "wa" | "fb" | "ig") => {
    if (!linkReady) return;
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

  const couriersRegistered = totals.couriers_registered ?? couriers.length;
  const couriersActive = totals.couriers_active ?? couriers.filter((c) => c.status === "פעיל").length;
  const businessesRegistered = totals.businesses_registered ?? businesses.length;
  const businessesActive = totals.businesses_active ?? businesses.filter((b) => b.status === "פעיל").length;
  const referredTotal = couriersRegistered + businessesRegistered;
  const stats = useMemo(() => ([
    { icon: Users, value: String(referredTotal), label: "סה״כ הפניות", hint: "שליחים ועסקים" },
    { icon: Bike, value: String(couriersActive), label: "שליחים פעילים", hint: `מתוך ${couriersRegistered} שנרשמו` },
    { icon: Store, value: String(businessesActive), label: "עסקים פעילים", hint: `מתוך ${businessesRegistered} שנרשמו` },
    { icon: Coins, value: `₪ ${money(Number(totals.profit ?? 0))}`, label: "סה״כ רווח", hint: "מכל המשלוחים שהושלמו" },
    { icon: Wallet, value: `₪ ${money(Number(totals.pending ?? 0))}`, label: "ממתין לתשלום", hint: "ייפתח בארנק ב-1 לחודש" },
  ]), [referredTotal, couriersActive, couriersRegistered, businessesActive, businessesRegistered, totals.profit, totals.pending]);

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F3F6F4]">
        <header className="relative z-20 shrink-0 border-b border-black/5 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">שתף והרוויח</h1>
            <CourierBellButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
            <section className="relative overflow-hidden rounded-[1.5rem] bg-[#164A28] text-primary-foreground shadow-[0_16px_40px_rgba(12,40,18,0.28)]">
              <div className="pointer-events-none absolute -left-10 top-6 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-black/20 blur-2xl" aria-hidden />
              <div className="relative flex items-stretch gap-2 sm:gap-4">
                <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-7">
                  <p className="text-[1.65rem] font-black leading-tight sm:text-3xl lg:text-4xl">תרוויח מכל הפניה!</p>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-primary-foreground/80 sm:text-sm">
                    שתף שליחים ועסקים — ₪1.50 על כל משלוח שהושלם, ו־₪3 אם גייסת את שני הצדדים לאותו משלוח.
                  </p>
                  <div className="mt-4 max-w-lg space-y-2">
                    <LinkRow
                      label="שליחים"
                      value={linkReady ? courierLink : mePending ? "טוען קישור…" : "הקישור יופיע בעוד רגע"}
                      onCopy={() => void copy(courierLink)}
                      disabled={!linkReady}
                      copyLabel="העתק קישור לשליחים"
                    />
                    {moreOpen && (
                      <LinkRow
                        label="עסקים"
                        value={linkReady ? businessLink : mePending ? "טוען קישור…" : "הקישור יופיע בעוד רגע"}
                        onCopy={() => void copy(businessLink)}
                        disabled={!linkReady}
                        copyLabel="העתק קישור לעסקים"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary-foreground/90"
                  >
                    עוד אפשרויות לשיתוף
                    <ChevronDown className={cn("size-4 transition-transform", moreOpen && "rotate-180")} />
                  </button>
                </div>
                <div className="relative min-h-[158px] w-[38%] min-w-[132px] max-w-[280px] shrink-0 self-stretch sm:min-h-[200px] sm:w-[42%] lg:min-h-[240px] lg:w-[300px]">
                  <img
                    src="/courier/share-hero.png?v=2"
                    alt=""
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[118%] w-full object-contain object-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,0.28)]"
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className={cn(
                        "rounded-[1.15rem] border border-black/5 bg-white p-3 shadow-[0_8px_20px_rgba(16,24,40,0.06)]",
                        i === stats.length - 1 && "col-span-2 sm:col-span-1",
                      )}
                    >
                      <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <p className="mt-2 break-words text-[17px] font-black tabular-nums leading-tight text-text-strong sm:text-lg">
                        {s.value}
                      </p>
                      <p className="mt-1 text-[12px] font-bold text-text-strong">{s.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{s.hint}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTab("courier"); setShowAll(false); }}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-extrabold",
                  tab === "courier" ? "border-primary/30 bg-primary-soft text-primary" : "border-black/5 bg-white text-text-subtle",
                )}
              >
                <ScooterIcon className="size-5" /> שליחים
              </button>
              <button
                type="button"
                onClick={() => { setTab("business"); setShowAll(false); }}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-extrabold",
                  tab === "business" ? "border-primary/30 bg-primary-soft text-primary" : "border-black/5 bg-white text-text-subtle",
                )}
              >
                <Store className="size-4" /> עסקים
              </button>
            </div>

            {isError && (
              <p className="rounded-[1.15rem] border border-border bg-white py-4 text-center text-sm text-destructive">
                לא הצלחנו לטעון את ההפניות. נסו שוב מאוחר יותר.
              </p>
            )}

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
                <p className="rounded-[1.15rem] border border-black/5 bg-white py-10 text-center text-sm text-text-muted">
                  עדיין אין הצטרפויות דרך הקישור שלך
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visible.map((row) => (
                    <li
                      key={row.id ?? row.full_name}
                      className="flex items-center gap-3 rounded-[1.15rem] border border-black/5 bg-white px-3 py-3 shadow-[0_8px_20px_rgba(16,24,40,0.05)]"
                    >
                      {tab === "courier" ? (
                        <CourierAvatar path={row.avatar_url} name={row.full_name} size={44} />
                      ) : (
                        <div className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                          <Building2 className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-sm font-bold text-text-strong">{row.full_name || "—"}</p>
                        <p className="mt-0.5 truncate text-[11px] text-text-muted">
                          {tab === "courier" && row.vehicle_type ? row.vehicle_type : joinDate(row.created_at)}
                          {row.jobs_completed != null ? ` · ${row.jobs_completed} משלוחים` : ""}
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-[11px] text-text-muted sm:block">{joinDate(row.created_at)}</p>
                      <div className="shrink-0 text-left">
                        <StatusPill status={row.status} />
                        <p className="mt-1 text-sm font-extrabold tabular-nums text-primary">₪ {money(Number(row.your_profit ?? 0))}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {tab === "courier" && businesses.length > 0 && (
                <div className="flex items-center justify-between rounded-[1.15rem] border border-black/5 bg-white px-3 py-3">
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

            <section className="space-y-3">
              <h2 className="text-sm font-extrabold text-text-strong">דרכים לשיתוף</h2>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <ShareCircle label="עוד אפשרויות" onClick={() => void share()} icon={<Share2 className="size-5" />} />
                <ShareCircle
                  label="אינסטגרם"
                  onClick={() => void share("ig")}
                  icon={<span className="text-[11px] font-black">IG</span>}
                  className="bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white"
                />
                <ShareCircle
                  label="פייסבוק"
                  onClick={() => void share("fb")}
                  icon={<span className="text-sm font-black">f</span>}
                  className="bg-[#1877F2] text-white"
                />
                <ShareCircle
                  label="וואטסאפ"
                  onClick={() => void share("wa")}
                  icon={<span className="text-[11px] font-black">WA</span>}
                  className="bg-[#25D366] text-white"
                />
                <ShareCircle label="העתק קישור" onClick={() => void copy()} icon={<Copy className="size-5" />} />
              </div>
            </section>

            <div className="flex items-start gap-2 rounded-[1.15rem] bg-white px-3 py-3 text-[12px] text-text-muted shadow-[0_8px_20px_rgba(16,24,40,0.04)]">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-extrabold text-text-strong">איך זה עובד?</p>
                <p className="mt-0.5 leading-relaxed">
                  ₪1.50 לכל משלוח ששליח שגייסת ביצע · ₪1.50 לכל משלוח שעסק שגייסת שיגר · ₪3 אם שניהם שלך על אותו משלוח
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function LinkRow({
  label,
  value,
  onCopy,
  disabled,
  copyLabel,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  disabled: boolean;
  copyLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
      <p className="w-14 shrink-0 text-[11px] font-bold text-primary-foreground/70">{label}</p>
      <p className="min-w-0 flex-1 truncate text-left text-xs font-semibold" dir="ltr">{value}</p>
      <button
        type="button"
        onClick={onCopy}
        disabled={disabled}
        className="grid size-10 place-items-center rounded-full bg-white text-primary disabled:opacity-50"
        aria-label={copyLabel}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const s = status || "ממתין";
  const tone = s === "פעיל"
    ? "bg-success-bg text-success-text"
    : s.includes("אימות") || s.includes("ממתין")
      ? "bg-warning-bg text-warning-text"
      : "bg-danger-bg text-danger-text";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", tone)}>{s}</span>;
}

function ShareCircle({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-[4.5rem] flex-col items-center gap-1.5">
      <span className={cn("grid size-12 place-items-center rounded-2xl border border-black/5 bg-white text-primary shadow-[0_8px_18px_rgba(16,24,40,0.08)]", className)}>
        {icon}
      </span>
      <span className="text-center text-[10px] font-semibold leading-tight text-text-subtle">{label}</span>
    </button>
  );
}
