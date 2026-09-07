import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Building2,
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
import { nestListMyCourierReferrals, nestMoveReferralCommissionsToWallet } from "@/lib/nest-domain";
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
    walleted_at?: string | null;
  }[];
  commission_ils?: number;
  totals?: {
    couriers_registered?: number;
    couriers_active?: number;
    businesses_registered?: number;
    businesses_active?: number;
    profit?: number;
    pending?: number;
    in_wallet?: number;
    available_to_wallet?: number;
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
  const qc = useQueryClient();
  const { data: me, isPending: mePending } = useMyCourier();
  const [tab, setTab] = useState<"courier" | "business">("courier");
  const [showAll, setShowAll] = useState(false);
  const code = referralCode(me);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://goi.co.il";
  const courierLink = code ? `${origin}/join?ref=${encodeURIComponent(code)}` : "";
  const businessLink = code ? `${origin}/signup-business?ref=${encodeURIComponent(code)}` : "";
  const link = courierLink;
  const linkReady = !!code;

  const { data, isError } = useQuery({
    queryKey: ["courier-referrals", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: fetchReferrals,
  });

  const couriers = data?.couriers ?? [];
  const businesses = data?.businesses ?? [];
  const commissions = data?.commissions ?? [];
  const list = tab === "courier" ? couriers : businesses;
  const visible = showAll ? list : list.slice(0, 4);
  const totals = data?.totals ?? {};
  const totalProfit = Number(totals.profit ?? 0);
  const availableToWallet = Number(totals.available_to_wallet ?? totals.pending ?? 0);
  const inWallet = Number(totals.in_wallet ?? 0);

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

  const moveToWallet = useMutation({
    mutationFn: nestMoveReferralCommissionsToWallet,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["courier-referrals"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      if (!res.amount) {
        toast.message("אין רווח חדש למשיכה לארנק");
        return;
      }
      toast.success(`₪ ${money(res.amount)} עברו לארנק תחת עמלות אפילייאט`);
    },
    onError: (e: Error) => toast.error(e.message || "לא הצלחנו להעביר לארנק"),
  });

  const couriersRegistered = totals.couriers_registered ?? couriers.length;
  const couriersActive = totals.couriers_active ?? couriers.filter((c) => c.status === "פעיל").length;
  const businessesRegistered = totals.businesses_registered ?? businesses.length;
  const businessesActive = totals.businesses_active ?? businesses.filter((b) => b.status === "פעיל").length;
  const referredTotal = couriersRegistered + businessesRegistered;
  const stats = useMemo(() => ([
    { icon: Users, value: String(referredTotal), label: "הפניות", hint: "שליחים ועסקים" },
    { icon: Bike, value: String(couriersActive), label: "שליחים", hint: `פעילים מתוך ${couriersRegistered}` },
    { icon: Store, value: String(businessesActive), label: "עסקים", hint: `פעילים מתוך ${businessesRegistered}` },
  ]), [referredTotal, couriersActive, couriersRegistered, businessesActive, businessesRegistered]);

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F3F6F4]">
        <header className="relative z-20 shrink-0 border-b border-black/5 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 lg:max-w-5xl">
            <CourierMenuButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">שתף והרוויח</h1>
            <CourierBellButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-5xl">
            <section className="overflow-hidden rounded-[1.5rem] bg-[#104421] text-white shadow-[0_12px_28px_rgba(12,40,18,0.22)]">
              <div className="relative h-48 w-full overflow-hidden sm:h-56">
                <img
                  src="/courier/share-hero.png?v=4"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-bottom"
                />
              </div>
              <div className="space-y-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <h2 className="text-[1.45rem] font-black leading-snug tracking-tight">תרוויחו מכל הפניה</h2>
                <p className="text-[14px] leading-relaxed text-white">
                  שתפו קישור לשליחים או לעסקים. ₪1.50 על כל משלוח שהושלם, ו־₪3 אם גייסתם את שני הצדדים לאותו משלוח.
                </p>
                <button
                  type="button"
                  onClick={() => void copy(courierLink)}
                  disabled={!linkReady}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-extrabold text-[#104421] disabled:opacity-60"
                >
                  <Copy className="size-4" />
                  {linkReady ? "העתק קישור לשליחים" : mePending ? "טוען קישור…" : "הקישור יופיע בעוד רגע"}
                </button>
                <button
                  type="button"
                  onClick={() => void copy(businessLink)}
                  disabled={!linkReady}
                  className="flex min-h-11 w-full items-center justify-center rounded-full bg-white/12 text-sm font-bold text-white disabled:opacity-60"
                >
                  העתק קישור לעסקים
                </button>
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-black/5 bg-white p-4 shadow-[0_8px_20px_rgba(16,24,40,0.06)]">
              <p className="text-[12px] font-bold text-text-muted">סה״כ רווח מאפילייאט</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-text-strong">₪ {money(totalProfit)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-2xl bg-[#F3F6F4] px-3 py-2">
                  <p className="font-bold text-text-muted">זמין למשיכה לארנק</p>
                  <p className="mt-0.5 text-base font-black tabular-nums text-primary">₪ {money(availableToWallet)}</p>
                </div>
                <div className="rounded-2xl bg-[#F3F6F4] px-3 py-2">
                  <p className="font-bold text-text-muted">כבר בארנק</p>
                  <p className="mt-0.5 text-base font-black tabular-nums text-text-strong">₪ {money(inWallet)}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={moveToWallet.isPending || availableToWallet <= 0}
                onClick={() => moveToWallet.mutate()}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-deep text-sm font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Wallet className="size-4" />
                {moveToWallet.isPending ? "מעביר לארנק…" : "משוך לארנק"}
              </button>
              <p className="mt-2 text-center text-[11px] leading-snug text-text-muted">
                {availableToWallet > 0
                  ? "הסכום ייכנס לארנק תחת רווח מעמלות אפילייאט"
                  : inWallet > 0
                    ? "כל הרווח כבר בארנק תחת עמלות אפילייאט"
                    : "עמלות נכנסות אחרי משלוח שנמסר"}
              </p>
              {inWallet > 0 && (
                <Link
                  to="/courier/wallet"
                  className="mt-2 flex min-h-10 items-center justify-center text-sm font-bold text-primary"
                >
                  מעבר לארנק
                </Link>
              )}
            </section>

            <section className="grid grid-cols-3 gap-2">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-[1.15rem] border border-black/5 bg-white p-3 shadow-[0_8px_20px_rgba(16,24,40,0.06)]"
                  >
                    <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <p className="mt-2 break-words text-[16px] font-black tabular-nums leading-tight text-text-strong">
                      {s.value}
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-snug text-text-strong">{s.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-text-muted">{s.hint}</p>
                  </div>
                );
              })}
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
                      <div className="shrink-0 text-left">
                        <StatusPill status={row.status} />
                        <p className="mt-1 text-sm font-extrabold tabular-nums text-primary">₪ {money(Number(row.your_profit ?? 0))}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {commissions.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-extrabold text-text-strong">עמלות אחרונות</h2>
                <ul className="flex flex-col gap-2">
                  {commissions.slice(0, 8).map((row) => (
                    <li
                      key={row.id ?? `${row.job_id}-${row.created_at}`}
                      className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-black/5 bg-white px-3 py-3"
                    >
                      <div className="min-w-0 text-right">
                        <p className="text-sm font-bold text-text-strong">
                          {row.kind === "business" ? "הפניית עסק" : "הפניית שליח"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {row.walleted_at ? "בארנק" : "ממתין למשיכה לארנק"}
                          {row.created_at ? ` · ${new Date(row.created_at).toLocaleDateString("he-IL")}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-extrabold tabular-nums text-primary">
                        ₪ {money(Number(row.amount ?? 0))}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-extrabold text-text-strong">שיתוף מהיר</h2>
              <div className="grid grid-cols-4 gap-2">
                <ShareCircle label="וואטסאפ" onClick={() => void share("wa")} icon={<span className="text-[11px] font-black">WA</span>} className="bg-[#25D366] text-white" />
                <ShareCircle label="פייסבוק" onClick={() => void share("fb")} icon={<span className="text-sm font-black">f</span>} className="bg-[#1877F2] text-white" />
                <ShareCircle label="אינסטגרם" onClick={() => void share("ig")} icon={<span className="text-[11px] font-black">IG</span>} className="bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)] text-white" />
                <ShareCircle label="עוד" onClick={() => void share()} icon={<Share2 className="size-5" />} />
              </div>
            </section>

            <div className="flex items-start gap-2 rounded-[1.15rem] bg-white px-3 py-3 text-[12px] text-text-muted shadow-[0_8px_20px_rgba(16,24,40,0.04)]">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-extrabold text-text-strong">איך זה עובד?</p>
                <p className="mt-0.5 leading-relaxed">
                  ₪1.50 לכל משלוח של שליח שגייסתם · ₪1.50 לכל משלוח של עסק שגייסתם · ₪3 אם שניהם שלכם. לחצו «משוך לארנק» כדי להעביר את הרווח לארנק.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CourierShell>
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
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={cn("grid size-12 place-items-center rounded-2xl border border-black/5 bg-white text-primary shadow-[0_8px_18px_rgba(16,24,40,0.08)]", className)}>
        {icon}
      </span>
      <span className="text-center text-[10px] font-semibold leading-tight text-text-subtle">{label}</span>
    </button>
  );
}
