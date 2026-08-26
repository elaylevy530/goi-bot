import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  nestListMyCourierOutcomes,
  nestListWithdrawals,
  nestGetMyCourierStats,
} from "@/lib/nest-domain";
import { nestSignedFileUrlResolved } from "@/lib/nest-files";
import { nestUpdatePassword } from "@/lib/nest-auth";
import { PushEnableRow } from "@/components/PushEnableRow";
import { pushSupported } from "@/lib/push/subscribe";
import {
  User,
  LogOut,
  ChevronLeft,
  MapPin,
  Bike,
  Wallet as WalletIcon,
  TrendingUp,
  Star,
  Share2,
  KeyRound,
  Loader2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useCourierTerms, type CourierTerms } from "@/lib/courier-kind";

export const Route = createFileRoute("/courier/profile/")({
  head: () => ({ meta: [{ title: "פרופיל — Goi" }] }),
  component: ProfilePage,
});

function buildMenu(t: CourierTerms) {
  return [
    { to: "/courier/profile/edit", label: "הפרופיל שלי", sub: "תמונה, פרטים אישיים ורכב", icon: User },
    { to: "/courier/profile/bank", label: "פרטי חשבון בנק", sub: "בנק, סניף ומספר חשבון לתשלום", icon: Building2 },
    { to: "/courier/performance", label: "ביצועים", sub: `הכנסות והיסטוריית ${t.jobPlural}`, icon: TrendingUp },
    { to: "/courier/ratings", label: "דירוגים וביצועים", sub: "ציון לקוחות ומדדי שירות", icon: Star },
    { to: "/courier/wallet", label: "ארנק ומשיכות", sub: "יתרה, תשלומים ומשיכות", icon: WalletIcon },
    { to: "/courier/share", label: "שתף והרוויח", sub: "הפנה שליחים ועסקים והרווח", icon: Share2 },
  ];
}

function initialsOf(name?: string | null) {
  if (!name) return "ש";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

function ProfilePage() {
  const terms = useCourierTerms();
  const { data: me } = useMyCourier();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pwd, setPwd] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["profile-hub-stats", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [statsRow, outcomes] = await Promise.all([
        nestGetMyCourierStats(),
        nestListMyCourierOutcomes(),
      ]);
      const liveRatings = (outcomes ?? [])
        .filter((o) => o.delivered_at && !o.was_cancelled && o.customer_rating != null)
        .map((o) => Number(o.customer_rating))
        .filter((n) => Number.isFinite(n) && n > 0);
      const liveAvg = liveRatings.length > 0
        ? liveRatings.reduce((sum, n) => sum + n, 0) / liveRatings.length
        : null;
      return { avg_rating: liveAvg ?? statsRow?.avg_rating ?? null };
    },
  });

  const avatarPath = (me as { avatar_url?: string | null } | null | undefined)?.avatar_url;
  const { data: avatarUrl } = useQuery({
    queryKey: ["courier-avatar-signed", me?.id, avatarPath],
    enabled: !!me?.id && !!avatarPath,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith("http")) return avatarPath;
      return nestSignedFileUrlResolved("courier-avatars", avatarPath, 60 * 60 * 24 * 7);
    },
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["profile-hub-balance", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [outs, wds] = await Promise.all([
        nestListMyCourierOutcomes(),
        nestListWithdrawals(),
      ]);
      const earned = (outs ?? [])
        .filter((o) => o.delivered_at && !o.was_cancelled)
        .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
      const paid = (wds ?? []).filter((w) => w.status === "שולמה").reduce((s, w) => s + Number(w.amount), 0);
      const reserved = (wds ?? [])
        .filter((w) => w.status !== "נדחתה" && w.status !== "שולמה")
        .reduce((s, w) => s + Number(w.amount), 0);
      return Math.max(0, earned - paid - reserved);
    },
  });

  const changePwd = useMutation({
    mutationFn: async () => {
      if (pwd.length < 6) throw new Error("סיסמה חייבת לפחות 6 תווים");
      await nestUpdatePassword(pwd);
    },
    onSuccess: () => { toast.success("הסיסמה עודכנה ✓"); setPwd(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isAvailable = me?.courier_status === "פעיל" && me?.is_paused !== true && me?.accepting_jobs !== false;
  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    const { nestLogout } = await import("@/lib/nest-auth");
    nestLogout();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <CourierShell title="פרופיל" subtitle="החשבון וההגדרות שלך">
      <div className="space-y-4 -mt-2 lg:max-w-3xl lg:mx-auto">
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="size-20 rounded-full overflow-hidden bg-gradient-to-br from-[#35AD29] to-[#2d9623] text-white grid place-items-center text-2xl font-extrabold ring-4 ring-emerald-100 shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="תמונת פרופיל" className="w-full h-full object-cover" /> : initialsOf(me?.full_name)}
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-extrabold text-slate-900 leading-none">פרופיל</h1>
            <p className="text-sm text-slate-500 mt-1.5">החשבון וההגדרות שלך</p>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                <span className={`size-1.5 rounded-full ${isAvailable ? "bg-[#35AD29]" : "bg-slate-400"}`} />
                {isAvailable ? "זמין" : "לא זמין"}
              </span>
              <div className="font-extrabold text-slate-900 truncate text-right">{me?.full_name ?? "—"}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-right">
                <div className="text-[11px] text-slate-500 mb-1">רכב ואזור</div>
                <div className="flex items-center gap-1 justify-end text-sm font-bold text-slate-800">
                  <span className="truncate">{me?.base_city ?? "—"}</span>
                  <MapPin className="size-3.5 text-[#35AD29] shrink-0" />
                </div>
                <div className="flex items-center gap-1 justify-end text-xs text-slate-600 mt-0.5">
                  <span className="truncate">{me?.vehicle_type ?? "—"}</span>
                  <Bike className="size-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
              <Link to="/courier/ratings" className="text-center border-r border-slate-100 pr-2">
                <div className="text-[11px] text-slate-500 mb-1">דירוג</div>
                <div className="flex items-center justify-center gap-1 font-extrabold text-slate-900">
                  <span>{stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—"}</span>
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                </div>
              </Link>
              <div className="text-center border-r border-slate-100 pr-2">
                <div className="text-[11px] text-slate-500 mb-1">יתרה זמינה למשיכה</div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-extrabold text-slate-900">₪{Number(balance).toLocaleString()}</span>
                  <span className="size-7 grid place-items-center rounded-full bg-emerald-50">
                    <WalletIcon className="size-3.5 text-[#35AD29]" />
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0 divide-y divide-slate-100">
            {buildMenu(terms).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} to={item.to} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                  <ChevronLeft className="size-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-bold text-slate-900 text-[15px] leading-tight">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{item.sub}</div>
                  </div>
                  <span className="size-10 grid place-items-center rounded-xl bg-emerald-50 shrink-0">
                    <Icon className="size-5 text-[#35AD29]" />
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-bold text-end">הגדרות בסיסיות</h2>
            {me?.id && pushSupported() && <PushEnableRow courierId={me.id} />}
            <div className="space-y-2">
              <Label className="text-end block">סיסמה חדשה</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                dir="ltr"
                minLength={6}
                placeholder="לפחות 6 תווים"
              />
              <Button
                className="w-full bg-[#35AD29] hover:bg-[#2d9623] text-white"
                onClick={() => changePwd.mutate()}
                disabled={changePwd.isPending || pwd.length < 6}
              >
                {changePwd.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                עדכן סיסמה
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-red-50 transition-colors">
              <ChevronLeft className="size-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <div className="font-bold text-red-600 text-[15px] leading-tight">יציאה</div>
                <div className="text-xs text-slate-500 mt-0.5">התנתקות מהחשבון</div>
              </div>
              <span className="size-10 grid place-items-center rounded-xl bg-red-50 shrink-0">
                <LogOut className="size-5 text-red-500" />
              </span>
            </button>
          </CardContent>
        </Card>
      </div>
    </CourierShell>
  );
}
