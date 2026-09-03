import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bike,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Heart,
  Info,
  Sparkles,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { BankDetailsFields } from "@/components/courier/BankDetailsFields";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { nestCreateWithdrawal, nestListActiveBonuses, nestListMyCourierOutcomes, nestListMyCourierReferrals, nestListWithdrawals, nestUpdateWithdrawal } from "@/lib/nest-domain";
import { nestUploadFile } from "@/lib/nest-files";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/wallet")({
  head: () => ({ meta: [{ title: "הארנק שלי — Goi" }] }),
  component: WalletPage,
});

const MIN_WITHDRAWAL = 400;

type OutcomeRow = {
  id?: string;
  delivered_at?: string | null;
  was_cancelled?: boolean | null;
  tip_amount?: number | null;
  jobs?: { payment?: number | null; job_number?: string | number | null } | null;
};

type WithdrawalRow = {
  id?: string;
  amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  payment_method?: string | null;
  bank_account?: string | null;
  receipt_url?: string | null;
};

function money(n: number) {
  return new Intl.NumberFormat("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function whenLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `${time} היום`;
  if (diff === 1) return `אתמול ${time}`;
  return d.toLocaleDateString("he-IL");
}

function maskAccount(raw?: string | null) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "לא חובר חשבון";
  return `${digits.slice(0, 4)} **** ${digits.slice(-4)}`;
}

function displayStatus(status?: string | null) {
  if (status === "שולמה") return { label: "הועבר לבנק", tone: "done" as const };
  if (status === "אושרה") return { label: "אושר", tone: "done" as const };
  if (status === "נדחתה") return { label: "נדחתה", tone: "bad" as const };
  return { label: "ממתין לאישור", tone: "wait" as const };
}

const ISRAEL_TZ = "Asia/Jerusalem";

function israelCalendarParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: num("year"), month: num("month"), day: num("day") };
}

function israelYearMonthValue(d: Date) {
  const { year, month } = israelCalendarParts(d);
  return year * 12 + month;
}

function isPreviousIsraelMonth(iso?: string | null, now = new Date()) {
  if (!iso) return false;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  return israelYearMonthValue(at) < israelYearMonthValue(now);
}

function nextWithdrawalWindowDate(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { year: nextYear, month: nextMonth, day: 1 };
}

function previousMonthLabel(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return new Date(Date.UTC(prevYear, prevMonth - 1, 15, 12, 0, 0)).toLocaleDateString("he-IL", {
    timeZone: ISRAEL_TZ,
    month: "long",
    year: "numeric",
  });
}

function formatIsraelDate(parts: { year: number; month: number; day: number }) {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  return new Date(utc).toLocaleDateString("he-IL", { timeZone: ISRAEL_TZ });
}

function WalletPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceTargetId, setInvoiceTargetId] = useState<string | null>(null);
  const [bankEditOpen, setBankEditOpen] = useState(false);
  const [accountOwner, setAccountOwner] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["wallet", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: () => nestListMyCourierOutcomes() as Promise<OutcomeRow[]>,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["wallet-withdrawals", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: () => nestListWithdrawals() as Promise<WithdrawalRow[]>,
  });

  const { data: referrals } = useQuery({
    queryKey: ["courier-referrals", me?.id],
    enabled: !!me?.id,
    refetchInterval: 30_000,
    queryFn: () => nestListMyCourierReferrals(),
  });
  const commissions = referrals?.commissions ?? [];

  const { data: bonuses = [] } = useQuery({
    queryKey: ["wallet-bonuses"],
    queryFn: () => nestListActiveBonuses(),
    staleTime: 30_000,
  });

  const completed = rows.filter((o) => o.delivered_at && !o.was_cancelled);
  const previousJobEarned = completed
    .filter((o) => isPreviousIsraelMonth(o.delivered_at))
    .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
  const currentJobEarned = completed
    .filter((o) => !isPreviousIsraelMonth(o.delivered_at))
    .reduce((s, o) => s + Number(o.jobs?.payment ?? 0) + Number(o.tip_amount ?? 0), 0);
  const previousCommissionEarned = commissions
    .filter((c) => isPreviousIsraelMonth(c.created_at))
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const currentCommissionEarned = commissions
    .filter((c) => !isPreviousIsraelMonth(c.created_at))
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const previousEarned = previousJobEarned + previousCommissionEarned;
  const currentMonthEarned = currentJobEarned + currentCommissionEarned;
  const paidOut = withdrawals.filter((w) => w.status === "שולמה").reduce((s, w) => s + Number(w.amount ?? 0), 0);
  const pending = withdrawals.filter((w) => w.status !== "נדחתה" && w.status !== "שולמה");
  const reserved = pending.reduce((s, w) => s + Number(w.amount ?? 0), 0);
  const available = Math.max(0, previousEarned - paidOut - reserved);
  const latestPending = pending
    .slice()
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];

  const bank = me as {
    bank_name?: string | null;
    bank_branch?: string | null;
    bank_account?: string | null;
    bank_account_owner?: string | null;
    full_name?: string | null;
    id?: string;
  } | null;
  const hasBank = !!(bank?.bank_name && bank?.bank_account);

  const fillBankFields = () => {
    setAccountOwner(bank?.bank_account_owner || bank?.full_name || me?.full_name || "");
    setBankName(bank?.bank_name || "");
    setBankBranch(bank?.bank_branch || "");
    setBankAccount(bank?.bank_account || "");
  };

  const openBankEdit = () => {
    fillBankFields();
    setBankEditOpen(true);
  };
  const nextWindow = nextWithdrawalWindowDate();
  const requestBlockReason = latestPending
    ? "יש כבר בקשת משיכה ממתינה"
    : !hasBank
      ? "יש למלא פרטי בנק"
      : available < MIN_WITHDRAWAL
        ? currentMonthEarned > 0
          ? `הסכום המינימלי למשיכה הוא ₪${MIN_WITHDRAWAL}. משלוחי החודש ייפתחו ב-${formatIsraelDate(nextWindow)}`
          : `הסכום המינימלי למשיכה הוא ₪${MIN_WITHDRAWAL}`
        : null;
  const needsInvoice = (me as { invoice_status?: string | null } | null)?.invoice_status === "כן";
  const invoiceWithdrawalId = invoiceTargetId || latestPending?.id || null;
  const invoiceAlreadyAttached = !!latestPending?.receipt_url;

  const tx = useMemo(() => {
    const items: {
      id: string;
      kind: "job" | "tip" | "bonus" | "withdraw" | "referral";
      title: string;
      at: string;
      amount: number;
      status?: string | null;
    }[] = [];
    for (const o of rows.filter((r) => r.delivered_at && !r.was_cancelled)) {
      const pay = Number(o.jobs?.payment ?? 0);
      const tip = Number(o.tip_amount ?? 0);
      const no = o.jobs?.job_number ? `#${o.jobs.job_number}` : "";
      if (pay) {
        items.push({ id: `job-${o.id}`, kind: "job", title: `רווח ממשלוח ${no}`.trim(), at: o.delivered_at!, amount: pay, status: "שולמה" });
      }
      if (tip) {
        items.push({ id: `tip-${o.id}`, kind: "tip", title: `טיפ ${no}`.trim(), at: o.delivered_at!, amount: tip, status: "אושרה" });
      }
    }
    for (const c of commissions) {
      const kindLabel = c.kind === "business" ? "עסק שגייסת" : "שליח שגייסת";
      items.push({
        id: `ref-${c.id}`,
        kind: "referral",
        title: `עמלה ${kindLabel}`,
        at: c.created_at || "",
        amount: Number(c.amount ?? 0),
        status: isPreviousIsraelMonth(c.created_at) ? "אושרה" : "ממתינה",
      });
    }
    for (const b of bonuses as { id?: string; title?: string; amount?: number; created_at?: string; ends_at?: string }[]) {
      items.push({
        id: `bonus-${b.id}`,
        kind: "bonus",
        title: b.title || "בונוס",
        at: b.created_at || b.ends_at || new Date().toISOString(),
        amount: Number(b.amount ?? 0),
        status: "ממתינה",
      });
    }
    for (const w of withdrawals) {
      items.push({
        id: `wd-${w.id}`,
        kind: "withdraw",
        title: w.status === "שולמה"
          ? `משיכה לבנק (הועבר לחשבון ${maskAccount(w.bank_account || bank?.bank_account)})`
          : `בקשת משיכה (הוגשה בתאריך: ${w.created_at ? new Date(w.created_at).toLocaleDateString("he-IL") : ""})`,
        at: w.created_at || "",
        amount: -Number(w.amount ?? 0),
        status: w.status,
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [rows, bonuses, withdrawals, bank?.bank_account, commissions]);

  const visibleTx = showAll ? tx : tx.slice(0, 5);

  const create = useMutation({
    mutationFn: async () => {
      const n = Number(amount);
      if (!me?.id) throw new Error("לא מחובר");
      if (latestPending) throw new Error("יש כבר בקשת משיכה ממתינה");
      if (!hasBank) throw new Error("יש למלא פרטי בנק");
      if (!Number.isFinite(n) || n < MIN_WITHDRAWAL) throw new Error(`הסכום המינימלי למשיכה הוא ₪${MIN_WITHDRAWAL}`);
      if (n > available) throw new Error("הסכום גבוה מהיתרה הזמינה");
      return nestCreateWithdrawal({
        courier_id: me.id,
        amount: n,
        payment_method: "bank",
        bank_name: bank?.bank_name,
        bank_branch: bank?.bank_branch,
        bank_account: bank?.bank_account,
        account_owner: (me as { bank_account_owner?: string; full_name?: string }).bank_account_owner || me.full_name,
      }) as Promise<WithdrawalRow>;
    },
    onSuccess: (created) => {
      toast.success("בקשת המשיכה נשלחה");
      setWithdrawOpen(false);
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet-withdrawals"] });
      if (needsInvoice) {
        setInvoiceTargetId(created?.id ?? null);
        setInvoiceFile(null);
        setInvoiceOpen(true);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadInvoice = useMutation({
    mutationFn: async ({ withdrawalId, file }: { withdrawalId: string; file: File }) => {
      const uploaded = await nestUploadFile("courier-ids", file);
      await nestUpdateWithdrawal(withdrawalId, { receipt_url: uploaded.path });
    },
    onSuccess: () => {
      toast.success("החשבונית הועלתה");
      setInvoiceFile(null);
      setInvoiceOpen(false);
      qc.invalidateQueries({ queryKey: ["wallet-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBank = useMutation({
    mutationFn: async () => {
      const owner = accountOwner.trim();
      const name = bankName.trim();
      const account = bankAccount.trim();
      if (!owner || !name || !account) throw new Error("יש למלא שם בעל החשבון, בנק ומספר חשבון");
      await nestUpdateMyCourier({
        bank_account_owner: owner,
        bank_name: name,
        bank_branch: bankBranch.trim() || null,
        bank_account: account,
      });
    },
    onSuccess: () => {
      toast.success("פרטי הבנק נשמרו");
      setBankEditOpen(false);
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold text-text-strong">הארנק שלי</h1>
            <div className="size-11 shrink-0" aria-hidden />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <section className="overflow-hidden rounded-card bg-primary-deep p-4 text-primary-foreground shadow-card-strong">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-right">
                  <p className="text-sm text-primary-foreground/80">יתרה זמינה למשיכה</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">₪ {money(available)}</p>
                  <p className="mt-2 text-xs text-primary-foreground/70">
                    משלוחים שהושלמו עד {previousMonthLabel()}
                    {currentMonthEarned > 0
                      ? ` · ₪${money(currentMonthEarned)} החודש ייפתחו ב-${formatIsraelDate(nextWindow)}`
                      : ""}
                  </p>
                </div>
                <div className="grid size-14 shrink-0 place-items-center rounded-card bg-primary-foreground/10">
                  <Wallet className="size-7" aria-hidden />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!hasBank) {
                    openBankEdit();
                    toast.error("יש למלא פרטי בנק");
                    return;
                  }
                  setFieldError(requestBlockReason);
                  setWithdrawOpen(true);
                }}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-surface text-sm font-extrabold text-primary active:bg-primary-soft"
              >
                <Building2 className="size-4" aria-hidden />
                בקשת משיכה
              </button>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-card border border-border bg-surface p-3 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-text-strong">בקשת משיכה ממתינה</p>
                  {latestPending && (
                    <span className="rounded-pill bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning-text">ממתין לאישור</span>
                  )}
                </div>
                {latestPending ? (
                  <>
                    <p className="mt-2 text-xl font-black tabular-nums text-text-strong">₪ {money(Number(latestPending.amount ?? 0))}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      הוגשה בתאריך: {latestPending.created_at ? new Date(latestPending.created_at).toLocaleDateString("he-IL") : "—"}
                    </p>
                    <WithdrawSteps status={latestPending.status} />
                    {needsInvoice && invoiceAlreadyAttached && (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-success-text">
                        <FileText className="size-3.5" aria-hidden />
                        חשבונית צורפה
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-6 text-sm text-text-muted">אין בקשה ממתינה</p>
                )}
              </div>

              <div className="rounded-card border border-border bg-surface p-3 shadow-card">
                <p className="text-xs font-bold text-text-strong">משלוחי החודש ייפתחו</p>
                <div className="mt-2 flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" aria-hidden />
                  <p className="text-lg font-black tabular-nums text-text-strong">
                    {formatIsraelDate(nextWindow)}
                  </p>
                </div>
                {currentMonthEarned > 0 ? (
                  <p className="mt-1 text-[11px] text-text-muted">
                    ₪ {money(currentMonthEarned)} עדיין לא זמינים
                  </p>
                ) : null}
                <span className="mt-2 inline-flex rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-success-text">
                  החל מ-1 לחודש, על חודשים קודמים
                </span>
              </div>
            </div>

            {needsInvoice && latestPending && !invoiceAlreadyAttached && (
              <section className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card">
                <div>
                  <p className="text-sm font-bold text-text-strong">העלאת חשבונית</p>
                  <p className="mt-1 text-xs text-text-muted">יש לצרף חשבונית לבקשת המשיכה הממתינה.</p>
                </div>
                <InvoiceUploadField
                  file={invoiceFile}
                  onFile={setInvoiceFile}
                  onClear={() => setInvoiceFile(null)}
                  onSubmit={() => {
                    if (!latestPending.id || !invoiceFile) return;
                    uploadInvoice.mutate({ withdrawalId: latestPending.id, file: invoiceFile });
                  }}
                  pending={uploadInvoice.isPending}
                />
              </section>
            )}

            <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
              <button
                type="button"
                onClick={() => (bankEditOpen ? setBankEditOpen(false) : openBankEdit())}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-3"
                aria-expanded={bankEditOpen}
              >
                <div className="grid size-9 place-items-center rounded-pill bg-primary-soft text-primary">
                  <Building2 className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm font-bold text-text-strong">{hasBank ? "חשבון בנק מחובר" : "פרטי חשבון בנק"}</p>
                  <p className="truncate text-xs text-text-muted">
                    {hasBank
                      ? `${bank?.bank_name} | סניף ${bank?.bank_branch || "—"} | ${maskAccount(bank?.bank_account)}`
                      : "מלאו כאן כדי להגיש בקשת משיכה"}
                  </p>
                </div>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-text-muted transition-transform", bankEditOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
              {bankEditOpen && (
                <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
                  <BankDetailsFields
                    accountOwner={accountOwner}
                    bankName={bankName}
                    bankBranch={bankBranch}
                    bankAccount={bankAccount}
                    onAccountOwner={setAccountOwner}
                    onBankName={setBankName}
                    onBankBranch={setBankBranch}
                    onBankAccount={setBankAccount}
                  />
                  <button
                    type="button"
                    disabled={saveBank.isPending}
                    onClick={() => saveBank.mutate()}
                    className="flex min-h-12 w-full items-center justify-center rounded-pill bg-primary-deep text-sm font-extrabold text-primary-foreground disabled:opacity-60"
                  >
                    {saveBank.isPending ? "שומר…" : "שמור"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex min-h-12 items-center gap-3 rounded-card border border-border bg-surface px-3 py-3 shadow-card">
              <div className="grid size-9 place-items-center rounded-pill bg-primary-soft text-primary">
                <Wallet className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-sm font-bold text-text-strong">סכום מינימלי למשיכה</p>
              </div>
              <p className="text-sm font-extrabold tabular-nums text-text-strong">₪ {money(MIN_WITHDRAWAL)}</p>
            </div>

            <div className="flex items-start gap-2 rounded-card bg-muted px-3 py-3 text-sm text-text">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>אפשר למשוך משלוחים מחודשים קודמים החל מה-1 לחודש. משלוחי החודש הנוכחי ייפתחו ב-1 לחודש הבא.</p>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-text-strong">תנועות אחרונות</h2>
                {tx.length > 5 && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 text-sm font-bold text-primary">
                    {showAll ? "הצג פחות" : "הצג את כל התנועות"}
                  </button>
                )}
              </div>
              {visibleTx.length === 0 ? (
                <p className="rounded-card border border-border bg-surface py-10 text-center text-sm text-text-muted">אין תנועות עדיין</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleTx.map((item) => {
                    const st = displayStatus(item.status);
                    const Icon = item.kind === "tip" ? Heart : item.kind === "bonus" ? Sparkles : item.kind === "withdraw" ? Building2 : item.kind === "referral" ? Users : Bike;
                    return (
                      <li key={item.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-3 shadow-card">
                        <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary-soft text-primary">
                          <Icon className="size-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <p className="truncate text-sm font-bold text-text-strong">{item.title}</p>
                          <p className="text-[11px] text-text-muted">{whenLabel(item.at)}</p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className={cn("text-sm font-extrabold tabular-nums", item.amount < 0 ? "text-text-strong" : "text-primary")}>
                            {item.amount < 0 ? `- ₪ ${money(Math.abs(item.amount))}` : `₪ ${money(item.amount)}`}
                          </p>
                          <span className={cn(
                            "mt-1 inline-flex rounded-pill px-2 py-0.5 text-[10px] font-bold",
                            st.tone === "wait" ? "bg-warning-bg text-warning-text" : st.tone === "bad" ? "bg-danger-bg text-danger-text" : "bg-success-bg text-success-text",
                          )}>
                            {st.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <Dialog
        open={withdrawOpen}
        onOpenChange={(open) => {
          setWithdrawOpen(open);
          if (!open) {
            setFieldError(null);
            setAmount("");
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">בקשת משיכה</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-text-subtle">
              יתרה זמינה (חודשים קודמים): ₪ {money(available)}
              {currentMonthEarned > 0
                ? `. משלוחי החודש (₪ ${money(currentMonthEarned)}) ייפתחו ב-${formatIsraelDate(nextWindow)}`
                : ""}
            </p>
            <div>
              <Label className="text-right" htmlFor="withdraw-amount">סכום למשיכה</Label>
              <Input
                id="withdraw-amount"
                type="number"
                min={MIN_WITHDRAWAL}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (!requestBlockReason) setFieldError(null);
                }}
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? "withdraw-amount-error" : undefined}
                className={cn("mt-1 min-h-11", fieldError && "border-destructive focus-visible:ring-destructive")}
                dir="ltr"
              />
              {fieldError && (
                <p id="withdraw-amount-error" role="alert" className="mt-1 text-right text-xs font-medium text-destructive">
                  {fieldError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => {
                if (requestBlockReason) {
                  setFieldError(requestBlockReason);
                  return;
                }
                const n = Number(amount);
                if (!Number.isFinite(n) || n < MIN_WITHDRAWAL) {
                  setFieldError(`הסכום המינימלי למשיכה הוא ₪${MIN_WITHDRAWAL}`);
                  return;
                }
                if (n > available) {
                  setFieldError("הסכום גבוה מהיתרה הזמינה");
                  return;
                }
                create.mutate();
              }}
              className="flex min-h-12 w-full items-center justify-center rounded-pill bg-primary-deep text-sm font-extrabold text-primary-foreground disabled:opacity-60"
            >
              שלח בקשה
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoiceOpen}
        onOpenChange={(open) => {
          setInvoiceOpen(open);
          if (!open) setInvoiceFile(null);
        }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">העלאת חשבונית</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-text-subtle">יש לצרף חשבונית לבקשת המשיכה.</p>
            <InvoiceUploadField
              file={invoiceFile}
              onFile={setInvoiceFile}
              onClear={() => setInvoiceFile(null)}
              onSubmit={() => {
                if (!invoiceWithdrawalId || !invoiceFile) return;
                uploadInvoice.mutate({ withdrawalId: invoiceWithdrawalId, file: invoiceFile });
              }}
              pending={uploadInvoice.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </CourierShell>
  );
}

function InvoiceUploadField({
  file,
  onFile,
  onClear,
  onSubmit,
  pending,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  onClear: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-border bg-muted px-3 text-sm font-bold text-text-strong active:bg-border">
        <Upload className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 truncate">{file?.name ?? "בחירת קובץ"}</span>
        <input
          key={file?.name ?? "empty"}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-text-muted"
          >
            <X className="size-3.5" aria-hidden />
            נקה
          </button>
          <p className="min-w-0 truncate text-[11px] text-text-subtle">{file.name}</p>
        </div>
      )}
      <button
        type="button"
        disabled={!file || pending}
        onClick={onSubmit}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-primary-deep text-sm font-extrabold text-primary-foreground disabled:opacity-60"
      >
        <FileText className="size-4" aria-hidden />
        {pending ? "מעלה…" : "העלה חשבונית"}
      </button>
    </div>
  );
}

function WithdrawSteps({ status }: { status?: string | null }) {
  const steps = [
    { key: "ממתינה", label: "ממתין לאישור" },
    { key: "אושרה", label: "אושר" },
    { key: "שולמה", label: "הועבר לבנק" },
  ];
  const idx = status === "שולמה" ? 2 : status === "אושרה" ? 1 : 0;
  return (
    <ol className="mt-3 flex items-center justify-between gap-1">
      {steps.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className={cn(
              "grid size-5 place-items-center rounded-full",
              done ? "bg-primary text-primary-foreground" : current ? "bg-warning-bg text-warning-text" : "bg-muted text-text-muted",
            )}>
              {done ? <Check className="size-3" /> : current ? <Clock className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className={cn("text-[9px] font-bold leading-tight", current ? "text-warning-text" : "text-text-muted")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
