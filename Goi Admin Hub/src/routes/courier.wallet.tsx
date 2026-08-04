import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet as WalletIcon, Loader2, Send, ArrowDownLeft, ArrowUpRight, TrendingUp,
  Clock, CheckCircle2, XCircle, Sparkles, Building2, Smartphone, Wallet,
  Route as RouteIcon, Coins, ChevronLeft, Gift, Calendar as CalendarIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/wallet")({
  head: () => ({ meta: [{ title: "הארנק שלי — Goi" }] }),
  component: WalletPage,
});

type Period = "day" | "week" | "month" | "custom";

function WalletPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountOwner, setAccountOwner] = useState("");
  const [note, setNote] = useState("");
  const [editBank, setEditBank] = useState(false);

  // Period filter for "my deliveries" report
  const [period, setPeriod] = useState<Period>("day");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [customFrom, setCustomFrom] = useState<string>(toDateInput(today));
  const [customTo, setCustomTo] = useState<string>(toDateInput(today));
  const [selectedOutcome, setSelectedOutcome] = useState<any | null>(null);

  // Prefill bank details from courier profile (saved once, reused every time)
  useEffect(() => {
    if (!me) return;
    setBankName((prev) => prev || (me as any).bank_name || "");
    setBankBranch((prev) => prev || (me as any).bank_branch || "");
    setBankAccount((prev) => prev || (me as any).bank_account || "");
    setAccountOwner((prev) => prev || (me as any).bank_account_owner || me.full_name || "");
  }, [me?.id]);

  const hasSavedBank = !!((me as any)?.bank_name && (me as any)?.bank_account && (me as any)?.bank_account_owner);

  const createWithdrawal = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error("לא נמצא שליח");
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("יש להזין סכום תקין");
      if (availableToWithdraw <= 0) throw new Error("אין יתרה זמינה למשיכה בארנק");
      if (amt > availableToWithdraw) throw new Error(`לא ניתן לבקש יותר מהיתרה הזמינה (₪${fmt(availableToWithdraw)})`);
      if (!bankName || !bankAccount || !accountOwner) throw new Error("יש למלא פרטי חשבון בנק");

      // Save bank details to courier profile so they're remembered next time
      const profileChanged =
        bankName !== ((me as any).bank_name ?? "") ||
        bankBranch !== ((me as any).bank_branch ?? "") ||
        bankAccount !== ((me as any).bank_account ?? "") ||
        accountOwner !== ((me as any).bank_account_owner ?? "");
      if (profileChanged) {
        await supabase.from("couriers").update({
          bank_name: bankName,
          bank_branch: bankBranch || null,
          bank_account: bankAccount,
          bank_account_owner: accountOwner,
        }).eq("id", me.id);
      }

      const { error } = await supabase.from("withdrawal_requests").insert({
        courier_id: me.id,
        amount: amt,
        payment_method: "bank",
        note: note || null,
        bank_name: bankName,
        bank_branch: bankBranch || null,
        bank_account: bankAccount,
        account_owner: accountOwner,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("בקשת המשיכה נשלחה למנהל ✓");
      setOpen(false);
      setEditBank(false);
      setAmount(""); setNote("");
      qc.invalidateQueries({ queryKey: ["wallet-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["my-courier"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const { data: rows = [] } = useQuery({
    queryKey: ["wallet", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("job_outcomes")
        .select("id, delivered_at, picked_up_at, was_cancelled, tip_amount, jobs(id, job_number, job_type, payment, distance_km, total_distance_km, estimated_distance_km, pickup_address, dropoff_address, pickup_area, dropoff_area, pickup_contact_name, pickup_contact_phone, pickup_notes, recipient_name, recipient_phone, dropoff_notes, package_type, package_size, number_of_packages, fragile, item_category, accepted_at, heading_to_pickup_at, arrived_at_pickup_at, picked_up_at, heading_to_dropoff_at, arrived_at_dropoff_at, delivered_at, customer_name)")
        .eq("courier_id", me!.id)
        .order("delivered_at", { ascending: false, nullsFirst: false })
        .limit(500);
      return (data ?? []) as any[];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["wallet-withdrawals", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("courier_id", me!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Active bonuses set from admin panel
  const { data: bonuses = [] } = useQuery({
    queryKey: ["wallet-bonuses"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("courier_bonuses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return ((data ?? []) as any[]).filter((b) => {
        if (b.starts_at && b.starts_at > nowIso) return false;
        if (b.ends_at && b.ends_at < nowIso) return false;
        return true;
      });
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!me?.id) return;
    const ch = supabase
      .channel(`wallet-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_outcomes", filter: `courier_id=eq.${me.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["wallet", me.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `courier_id=eq.${me.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["wallet-withdrawals", me.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_bonuses" }, () => {
        qc.invalidateQueries({ queryKey: ["wallet-bonuses"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, qc]);

  const sumBetween = (start: string, end?: string) => rows
    .filter((o) => o.delivered_at && !o.was_cancelled && o.delivered_at >= start && (!end || o.delivered_at <= end))
    .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);

  const earnedToday = sumBetween(todayStart.toISOString());
  const earnedMonth = sumBetween(monthStart);
  const earnedWeek = sumBetween(weekStart);
  const earnedLastMonth = sumBetween(lastMonthStart, lastMonthEnd);
  const monthDelta = earnedLastMonth > 0 ? ((earnedMonth - earnedLastMonth) / earnedLastMonth) * 100 : 0;

  const totalEarned = rows
    .filter((o) => o.delivered_at && !o.was_cancelled)
    .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
  const totalTips = rows
    .filter((o) => o.delivered_at && !o.was_cancelled)
    .reduce((s, o) => s + Number(o.tip_amount ?? 0), 0);
  const kmOf = (o: any) => Number(o?.jobs?.total_distance_km ?? o?.jobs?.distance_km ?? o?.jobs?.estimated_distance_km ?? 0);
  const totalKm = rows
    .filter((o) => o.delivered_at && !o.was_cancelled)
    .reduce((s, o) => s + kmOf(o), 0);
  const kmToday = rows
    .filter((o) => o.delivered_at && !o.was_cancelled && o.delivered_at >= todayStart.toISOString())
    .reduce((s, o) => s + kmOf(o), 0);
  const jobsToday = rows.filter((o) => o.delivered_at && !o.was_cancelled && o.delivered_at >= todayStart.toISOString()).length;
  const pricePerKm = totalKm > 0 ? totalEarned / totalKm : 0;

  const paidOut = (withdrawals as any[])
    .filter((w: any) => w.status === "שולמה")
    .reduce((s: number, w: any) => s + Number(w.amount), 0);
  const reservedWithdrawals = (withdrawals as any[])
    .filter((w: any) => w.status !== "נדחתה" && w.status !== "שולמה")
    .reduce((s: number, w: any) => s + Number(w.amount), 0);
  const balance = Math.max(0, totalEarned - paidOut);
  const availableToWithdraw = Math.max(0, balance - reservedWithdrawals);

  // 7-day chart
  const weeklyBars = useMemo(() => {
    const days: { label: string; value: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const sum = rows
        .filter((o) => o.delivered_at && !o.was_cancelled && new Date(o.delivered_at) >= d && new Date(o.delivered_at) < next)
        .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
      days.push({
        label: ["א", "ב", "ג", "ד", "ה", "ו", "ש"][d.getDay()],
        value: sum,
        date: d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
      });
    }
    return days;
  }, [rows]);
  const maxBar = Math.max(1, ...weeklyBars.map((b) => b.value));
  const weekAvg = earnedWeek / 7;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      "ממתינה": "bg-amber-500/15 text-amber-700 border-amber-500/30",
      "אושרה": "bg-sky-500/15 text-sky-700 border-sky-500/30",
      "שולמה": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      "נדחתה": "bg-rose-500/15 text-rose-700 border-rose-500/30",
    };
    return <Badge variant="outline" className={`${map[s] ?? ""} rounded-full font-medium text-[10px]`}>{s}</Badge>;
  };

  const fmt = (n: number) => new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(n);
  const fmt1 = (n: number) => new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(n);

  return (
    <CourierShell title="הארנק שלי" subtitle="רווחים, יעדים ותשלומים">
      <div className="-mx-1 sm:mx-0 space-y-4">
        {/* ============ HERO BALANCE ============ */}
        <div className="relative overflow-hidden rounded-[2rem] shadow-lg shadow-emerald-900/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700" />
          {/* soft ambient orbs */}
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-12 w-80 h-80 rounded-full bg-teal-200/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />

          <div className="relative p-6 text-white">
            <div className="flex justify-between items-start mb-6">
              <div className="text-end min-w-0">
                <div className="text-[11px] text-white/70">שלום,</div>
                <div className="text-base font-bold truncate max-w-[200px]">{me?.full_name ?? "שליח"}</div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
                <Sparkles className="size-3.5" />
                <span className="text-xs font-semibold tracking-wide">Goi · ארנק</span>
              </div>
            </div>

            <div className="text-end mb-6">
              <p className="text-emerald-50/90 text-sm font-medium mb-1">יתרה זמינה למשיכה</p>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-emerald-100 text-2xl font-bold">₪</span>
                <span className="text-5xl font-black tracking-tight tabular-nums">{fmt(availableToWithdraw)}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-white/85">
                <span>סה״כ ברווח: <b className="text-white">₪{fmt(balance)}</b></span>
                {reservedWithdrawals > 0 && (
                  <>
                    <span className="size-1 rounded-full bg-white/50" />
                    <span>בתהליך משיכה: <b className="text-white">₪{fmt(reservedWithdrawals)}</b></span>
                  </>
                )}
              </div>
            </div>

            {/* mini stat strip */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-end">
              <HeroChip label="הרווחת היום" value={`₪${fmt(earnedToday)}`} />
              <HeroChip label="ק״מ היום" value={fmt1(kmToday)} />
              <HeroChip label="משלוחים היום" value={String(jobsToday)} />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button
                  disabled={availableToWithdraw <= 0}
                  className="w-full bg-white text-[#1f7a18] py-3.5 rounded-2xl font-bold text-[15px] shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="size-4" /> בקשת משיכה מיידית
                </button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-end">בקשת משיכה</DialogTitle>
                  <DialogDescription className="text-end">הבקשה תישלח למנהל לאישור ותשלום</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-end block mb-1">סכום (₪)</Label>
                    <Input type="number" inputMode="decimal" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-end" />
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <button type="button" className="text-primary font-bold" onClick={() => setAmount(String(Math.floor(availableToWithdraw)))}>הזן הכל</button>
                      <span className="text-slate-500">זמין: ₪{fmt(availableToWithdraw)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-end">
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        type="button"
                        className="text-[11px] text-primary font-bold"
                        onClick={() => setEditBank((v) => !v)}
                      >
                        {editBank ? "סגור עריכה" : (hasSavedBank ? "עריכת פרטי בנק" : "הוסף פרטי בנק")}
                      </button>
                      <div>
                        <Label className="text-[11px] block">חשבון לתשלום (העברה בנקאית)</Label>
                        {hasSavedBank && !editBank && (
                          <div className="text-[12px] font-bold mt-0.5">
                            {accountOwner} · {bankName}{bankBranch ? ` (סניף ${bankBranch})` : ""} · חשבון {bankAccount}
                          </div>
                        )}
                        {!hasSavedBank && !editBank && (
                          <div className="text-[11px] text-amber-700 mt-0.5">לא נשמרו פרטי בנק — נדרש למילוי חד פעמי</div>
                        )}
                      </div>
                    </div>
                    {(editBank || !hasSavedBank) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="col-span-2"><Label className="text-end block mb-1 text-[11px]">שם בעל החשבון</Label><Input value={accountOwner} onChange={(e) => setAccountOwner(e.target.value)} className="text-end" /></div>
                        <div><Label className="text-end block mb-1 text-[11px]">בנק</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="text-end" /></div>
                        <div><Label className="text-end block mb-1 text-[11px]">סניף</Label><Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className="text-end" /></div>
                        <div className="col-span-2"><Label className="text-end block mb-1 text-[11px]">מספר חשבון</Label><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="text-end" /></div>
                        <div className="col-span-2 text-[10px] text-muted-foreground">הפרטים יישמרו אוטומטית ויהיו מוכנים לכל בקשה הבאה.</div>
                      </div>
                    )}
                  </div>

                  <div><Label className="text-end block mb-1">הערה (לא חובה)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="text-end" rows={2} /></div>

                  {availableToWithdraw <= 0 && (
                    <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 text-end">
                      אין יתרה זמינה למשיכה בארנק כרגע.
                    </div>
                  )}
                  {Number(amount) > availableToWithdraw && availableToWithdraw > 0 && (
                    <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 text-end">
                      הסכום חורג מהיתרה הזמינה (₪{fmt(availableToWithdraw)}).
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:flex-row-reverse">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={
                      createWithdrawal.isPending ||
                      availableToWithdraw <= 0 ||
                      !Number(amount) ||
                      Number(amount) <= 0 ||
                      Number(amount) > availableToWithdraw
                    }
                    onClick={() => createWithdrawal.mutate()}
                  >
                    {createWithdrawal.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} שלח בקשה
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ============ QUICK KPI CARDS ============ */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={<Coins className="size-4" />} label="הרווחת היום" value={`₪${fmt(earnedToday)}`} sub={`${jobsToday} משלוחים`} />
          <KpiCard icon={<RouteIcon className="size-4" />} label="ק״מ היום" value={fmt1(kmToday)} sub={`ממוצע ₪${fmt1(pricePerKm)}/ק״מ`} />
        </div>

        {/* ============ ADMIN BONUSES ============ */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Gift className="size-4" />
              </div>
              <div className="text-end">
                <div className="text-sm font-bold">בונוסים פעילים</div>
                <div className="text-[11px] text-muted-foreground">מבצעים יומיים מההנהלה</div>
              </div>
            </div>
          </div>
          {bonuses.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">אין בונוסים פעילים כרגע</div>
          ) : (
            <ul className="space-y-2">
              {bonuses.map((b: any) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="min-w-0 text-end flex-1">
                    <div className="text-sm font-bold truncate">{b.title}</div>
                    {b.description && <div className="text-[11px] text-muted-foreground truncate">{b.description}</div>}
                  </div>
                  <div className="shrink-0 text-end">
                    <div className="text-base font-black text-primary tabular-nums">+₪{fmt(Number(b.amount))}</div>
                    {b.ends_at && <div className="text-[10px] text-muted-foreground">עד {formatDateHe(new Date(b.ends_at))}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ============ WEEKLY CHART ============ */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-white/5 p-5 text-white shadow-xl">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-bold text-base">הכנסות השבוע</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">ממוצע יומי ₪{fmt(weekAvg)}</p>
            </div>
            <div className="text-end">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">7 ימים</div>
              <div className="text-xl font-black tabular-nums">₪{fmt(earnedWeek)}</div>
            </div>
          </div>

          <div className="flex items-end justify-between h-28 gap-2 mb-2" dir="ltr">
            {weeklyBars.map((b, i) => {
              const h = (b.value / maxBar) * 100;
              const isToday = i === weeklyBars.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full h-24 flex items-end relative">
                    {b.value > 0 && isToday && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-300 whitespace-nowrap">
                        ₪{fmt(b.value)}
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(53,173,41,0.5)]"
                          : "bg-white/10 group-hover:bg-emerald-500/40"
                      }`}
                      style={{ height: `${Math.max(h, b.value > 0 ? 8 : 3)}%` }}
                      title={`${b.date}: ₪${fmt(b.value)}`}
                    />
                  </div>
                  <div className={`text-[10px] ${isToday ? "font-bold text-emerald-300" : "text-slate-500"}`}>{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ SUMMARY STATS ============ */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={<TrendingUp className="size-4" />} label="החודש" value={`₪${fmt(earnedMonth)}`} trend={earnedLastMonth > 0 ? monthDelta : undefined} />
          <StatTile icon={<Sparkles className="size-4" />} label="טיפים" value={`₪${fmt(totalTips)}`} />
          <StatTile icon={<RouteIcon className="size-4" />} label="ק״מ סה״כ" value={fmt1(totalKm)} />
        </div>

        {/* ============ MY REPORT (by period) ============ */}
        {(() => {
          const startEnd = (() => {
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const end = new Date(); end.setHours(23, 59, 59, 999);
            if (period === "day") return { start, end };
            if (period === "week") { start.setDate(start.getDate() - 6); return { start, end }; }
            if (period === "month") { start.setDate(1); return { start, end }; }
            const s = new Date(customFrom); s.setHours(0, 0, 0, 0);
            const e = new Date(customTo); e.setHours(23, 59, 59, 999);
            return { start: s, end: e };
          })();
          const inRange = rows.filter((o) => o.delivered_at && !o.was_cancelled
            && new Date(o.delivered_at) >= startEnd.start && new Date(o.delivered_at) <= startEnd.end);
          const repEarn = inRange.reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
          const repKm = inRange.reduce((s, o) => s + kmOf(o), 0);
          const repJobs = inRange.length;
          const repPerKm = repKm > 0 ? repEarn / repKm : 0;
          return (
            <div className="rounded-3xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <CalendarIcon className="size-4" />
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-bold">הדוח שלי</div>
                    <div className="text-[11px] text-muted-foreground">סכומים, משלוחים וק״מ לפי תקופה</div>
                  </div>
                </div>
              </div>

              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} dir="rtl">
                <TabsList className="grid grid-cols-4 w-full mb-3 h-9">
                  <TabsTrigger value="day" className="text-xs">יומי</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">שבועי</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">חודשי</TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs">מותאם</TabsTrigger>
                </TabsList>
                <TabsContent value="custom" className="mb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-end block mb-1">מתאריך</Label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-end block mb-1">עד תאריך</Label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} dir="ltr" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat label="הכנסה" value={`₪${fmt(repEarn)}`} />
                <MiniStat label="משלוחים" value={String(repJobs)} />
                <MiniStat label="ק״מ" value={fmt1(repKm)} />
                <MiniStat label="ממוצע ₪/ק״מ" value={`₪${fmt1(repPerKm)}`} />
              </div>

              <div className="mt-3 text-[10px] text-muted-foreground text-end">
                {startEnd.start.toLocaleDateString("he-IL")} – {startEnd.end.toLocaleDateString("he-IL")}
              </div>

              {/* Deliveries list */}
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="text-xs font-bold text-end mb-2 text-muted-foreground">משלוחים בתקופה ({inRange.length})</div>
                {inRange.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">לא בוצעו משלוחים בתקופה זו</div>
                ) : (
                  <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {inRange.map((o: any) => {
                      const j = o.jobs ?? {};
                      const payTotal = Number(j.payment ?? 0) + Number(o.tip_amount ?? 0);
                      const km = kmOf(o);
                      return (
                        <li key={o.id}>
                          <button
                            onClick={() => setSelectedOutcome(o)}
                            className="w-full text-end p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/60 active:scale-[0.99] transition flex items-center justify-between gap-3"
                          >
                            <div className="shrink-0 text-end">
                              <div className="text-sm font-black tabular-nums">₪{fmt(payTotal)}</div>
                              <div className="text-[10px] text-muted-foreground">{fmt1(km)} ק״מ</div>
                            </div>
                            <div className="min-w-0 flex-1 text-end">
                              <div className="text-[13px] font-bold truncate">
                                {[j.pickup_area, j.dropoff_area].filter(Boolean).join(" ← ") || j.dropoff_address || "משלוח"}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {j.job_number ? `#${j.job_number} · ` : ""}
                                {o.delivered_at ? new Date(o.delivered_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}

        {/* ============ JOB DETAILS DIALOG ============ */}
        <Dialog open={!!selectedOutcome} onOpenChange={(o) => !o && setSelectedOutcome(null)}>
          <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto">
            {selectedOutcome && (() => {
              const j = selectedOutcome.jobs ?? {};
              const payTotal = Number(j.payment ?? 0) + Number(selectedOutcome.tip_amount ?? 0);
              const km = kmOf(selectedOutcome);
              const tHe = (iso?: string | null) =>
                iso ? new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
              const timeline: { label: string; at?: string | null }[] = [
                { label: "אושר", at: j.accepted_at },
                { label: "בדרך לאיסוף", at: j.heading_to_pickup_at },
                { label: "הגעה לאיסוף", at: j.arrived_at_pickup_at },
                { label: "נאסף", at: j.picked_up_at ?? selectedOutcome.picked_up_at },
                { label: "בדרך למסירה", at: j.heading_to_dropoff_at },
                { label: "הגעה למסירה", at: j.arrived_at_dropoff_at },
                { label: "נמסר", at: j.delivered_at ?? selectedOutcome.delivered_at },
              ];
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-end">
                      פרטי משלוח {j.job_number ? `#${j.job_number}` : ""}
                    </DialogTitle>
                    <DialogDescription className="text-end">
                      {selectedOutcome.delivered_at ? new Date(selectedOutcome.delivered_at).toLocaleDateString("he-IL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : ""}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <MiniStat label="תשלום" value={`₪${fmt(payTotal)}`} />
                      <MiniStat label="טיפ" value={`₪${fmt(Number(selectedOutcome.tip_amount ?? 0))}`} />
                      <MiniStat label="ק״מ" value={fmt1(km)} />
                    </div>

                    {/* Pickup */}
                    <div className="rounded-2xl border border-border/60 p-3 text-end">
                      <div className="text-[10px] text-muted-foreground font-bold mb-1">איסוף</div>
                      <div className="text-sm font-bold">{j.pickup_address || "—"}</div>
                      {j.pickup_area && <div className="text-[11px] text-muted-foreground">{j.pickup_area}</div>}
                      {(j.pickup_contact_name || j.pickup_contact_phone) && (
                        <div className="text-[11px] mt-1.5">
                          {j.pickup_contact_name}{j.pickup_contact_phone ? ` · ${j.pickup_contact_phone}` : ""}
                        </div>
                      )}
                      {j.pickup_notes && <div className="text-[11px] text-muted-foreground mt-1 italic">"{j.pickup_notes}"</div>}
                    </div>

                    {/* Dropoff */}
                    <div className="rounded-2xl border border-border/60 p-3 text-end">
                      <div className="text-[10px] text-muted-foreground font-bold mb-1">מסירה</div>
                      <div className="text-sm font-bold">{j.dropoff_address || "—"}</div>
                      {j.dropoff_area && <div className="text-[11px] text-muted-foreground">{j.dropoff_area}</div>}
                      {(j.recipient_name || j.recipient_phone) && (
                        <div className="text-[11px] mt-1.5">
                          {j.recipient_name}{j.recipient_phone ? ` · ${j.recipient_phone}` : ""}
                        </div>
                      )}
                      {j.dropoff_notes && <div className="text-[11px] text-muted-foreground mt-1 italic">"{j.dropoff_notes}"</div>}
                    </div>

                    {/* Package info */}
                    {(j.package_type || j.package_size || j.number_of_packages || j.item_category || j.fragile) && (
                      <div className="rounded-2xl border border-border/60 p-3 text-end">
                        <div className="text-[10px] text-muted-foreground font-bold mb-1">פרטי החבילה</div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {j.item_category && <Badge variant="outline" className="text-[10px]">{j.item_category}</Badge>}
                          {j.package_type && <Badge variant="outline" className="text-[10px]">{j.package_type}</Badge>}
                          {j.package_size && <Badge variant="outline" className="text-[10px]">{j.package_size}</Badge>}
                          {j.number_of_packages > 1 && <Badge variant="outline" className="text-[10px]">{j.number_of_packages} חבילות</Badge>}
                          {j.fragile && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-500/40">שביר</Badge>}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="rounded-2xl border border-border/60 p-3">
                      <div className="text-[10px] text-muted-foreground font-bold mb-2 text-end">ציר זמן</div>
                      <ol className="space-y-1.5">
                        {timeline.map((t, i) => (
                          <li key={i} className="flex items-center justify-between text-[12px]">
                            <span className={`tabular-nums ${t.at ? "text-foreground" : "text-muted-foreground/60"}`}>{tHe(t.at)}</span>
                            <span className={`font-medium ${t.at ? "text-foreground" : "text-muted-foreground/60"}`}>{t.label}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedOutcome(null)}>סגור</Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>



        <div className="rounded-3xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <ArrowUpRight className="size-4" />
              </div>
              <div className="text-end">
                <div className="text-sm font-bold">היסטוריית משיכות</div>
                <div className="text-[11px] text-muted-foreground">{withdrawals.length} בקשות</div>
              </div>
            </div>
          </div>

          {withdrawals.length === 0 ? (
            <EmptyState icon={<Send className="size-10" />} text="עדיין לא הוגשו בקשות משיכה" />
          ) : (
            <ul className="space-y-2.5">
              {(withdrawals as any[]).map((w) => (
                <li key={w.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-2xl border border-border/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {w.payment_method === "bit" ? <Smartphone className="size-5" /> : <Building2 className="size-5" />}
                    </div>
                    <div className="min-w-0 text-end">
                      <div className="text-sm font-bold">{w.payment_method === "bit" ? "ביט" : "העברה בנקאית"}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" })}</div>
                    </div>
                  </div>
                  <div className="text-end space-y-1 shrink-0">
                    <div className="font-black tabular-nums flex items-center gap-1 justify-end">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                      ₪{fmt(Number(w.amount))}
                    </div>
                    {statusBadge(w.status)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* payout schedule note */}
        <div className="flex items-center gap-2 px-1 pb-2 text-[11px] text-muted-foreground">
          <Wallet className="size-3.5" />
          <span>המשיכות מאושרות ומוצאות לתשלום בימי עסקים תוך 1-2 ימים</span>
          <ChevronLeft className="size-3.5 mr-auto" />
        </div>
      </div>
    </CourierShell>
  );
}

function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2">
      <div className="text-[10px] text-white/75">{label}</div>
      <div className="text-sm font-black tabular-nums">{value}</div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="size-8 rounded-xl flex items-center justify-center border bg-primary/10 text-primary border-primary/20">{icon}</div>
      </div>
      <div className="text-end">
        <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
        <div className="text-xl font-black tabular-nums leading-tight">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        {trend !== undefined && (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-600"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-end">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-sm font-extrabold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/40 p-2 text-end">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <div className="flex justify-center mb-2 opacity-50">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateHe(d: Date) {
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
