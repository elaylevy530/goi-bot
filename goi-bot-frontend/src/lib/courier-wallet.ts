import { jobOfferPay } from "@/lib/courier-live-jobs";

const ISRAEL_TZ = "Asia/Jerusalem";

export type WalletJobRef = {
  payment?: unknown;
  suggested_courier_payment?: unknown;
  customer_price?: unknown;
  job_number?: string | number | null;
  delivered_at?: string | null;
  job_date?: string | null;
  status?: string | null;
  delivery_status?: string | null;
};

export type WalletOutcome = {
  delivered_at?: string | null;
  created_at?: string | null;
  was_cancelled?: boolean | null;
  tip_amount?: unknown;
  jobs?: WalletJobRef | WalletJobRef[] | null;
};

export type WalletCommission = {
  amount?: unknown;
  created_at?: string | null;
};

export type WalletWithdrawal = {
  amount?: number | string | null;
  status?: string | null;
};

export type WalletMonthRow = {
  key: string;
  label: string;
  earned: number;
  closed: boolean;
};

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

export function isPaidWithdrawal(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  return status === "שולמה" || s === "paid";
}

export function isRejectedWithdrawal(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  return status === "נדחתה" || s === "rejected";
}

export function isOpenWithdrawal(status?: string | null) {
  return !isPaidWithdrawal(status) && !isRejectedWithdrawal(status);
}

export function outcomeJob(outcome: WalletOutcome): WalletJobRef | null {
  const jobs = outcome.jobs;
  if (Array.isArray(jobs)) return jobs[0] ?? null;
  return jobs ?? null;
}

export function isWalletCompletedOutcome(outcome: WalletOutcome) {
  if (outcome.was_cancelled) return false;
  const job = outcomeJob(outcome);
  return !!(
    outcome.delivered_at ||
    job?.delivered_at ||
    job?.status === "הושלמה" ||
    job?.delivery_status === "delivered" ||
    job?.delivery_status === "נמסר"
  );
}

export function outcomeEarnedAt(outcome: WalletOutcome) {
  const job = outcomeJob(outcome);
  return outcome.delivered_at || job?.delivered_at || job?.job_date || outcome.created_at || null;
}

export function outcomeCourierPay(outcome: WalletOutcome) {
  return jobOfferPay(outcomeJob(outcome)) + (Number(outcome.tip_amount ?? 0) || 0);
}

export function isPreviousIsraelMonth(iso?: string | null, now = new Date()) {
  if (!iso) return false;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  return israelYearMonthValue(at) < israelYearMonthValue(now);
}

export function currentIsraelYearMonthKey(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function israelYearMonthKey(iso?: string | null) {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const { year, month } = israelCalendarParts(at);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function labelIsraelYearMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)).toLocaleDateString("he-IL", {
    timeZone: ISRAEL_TZ,
    month: "long",
    year: "numeric",
  });
}

export function currentMonthLabel(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  return labelIsraelYearMonth(`${year}-${String(month).padStart(2, "0")}`);
}

export function nextWithdrawalWindowDate(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return { year: nextYear, month: nextMonth, day: 1 };
}

export function formatIsraelDate(parts: { year: number; month: number; day: number }) {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0);
  return new Date(utc).toLocaleDateString("he-IL", { timeZone: ISRAEL_TZ });
}

export function summarizeCourierWallet({
  outcomes,
  commissions = [],
  withdrawals = [],
  now = new Date(),
}: {
  outcomes: WalletOutcome[];
  commissions?: WalletCommission[];
  withdrawals?: WalletWithdrawal[];
  now?: Date;
}) {
  const completed = outcomes.filter(isWalletCompletedOutcome);
  const monthMap = new Map<string, number>();
  const add = (iso: string | null | undefined, amount: number) => {
    const key = israelYearMonthKey(iso);
    if (!key || !Number.isFinite(amount) || amount === 0) return;
    monthMap.set(key, (monthMap.get(key) ?? 0) + amount);
  };

  for (const o of completed) add(outcomeEarnedAt(o), outcomeCourierPay(o));
  for (const c of commissions) add(c.created_at, Number(c.amount ?? 0) || 0);

  const currentKey = currentIsraelYearMonthKey(now);
  const months: WalletMonthRow[] = [...monthMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, earned]) => ({
      key,
      label: labelIsraelYearMonth(key),
      earned,
      closed: key < currentKey,
    }));

  const currentMonthEarned = months.find((m) => m.key === currentKey)?.earned ?? 0;
  const closedMonths = months.filter((m) => m.closed);
  const previousEarned = closedMonths.reduce((s, m) => s + m.earned, 0);
  const paidOut = withdrawals.filter((w) => isPaidWithdrawal(w.status)).reduce((s, w) => s + Number(w.amount ?? 0), 0);
  const reserved = withdrawals.filter((w) => isOpenWithdrawal(w.status)).reduce((s, w) => s + Number(w.amount ?? 0), 0);
  const available = Math.max(0, previousEarned - paidOut - reserved);
  const unlockOn = nextWithdrawalWindowDate(now);

  return {
    currentMonthEarned,
    currentMonthLabel: currentMonthLabel(now),
    previousEarned,
    closedMonths,
    available,
    reserved,
    paidOut,
    unlockingAmount: currentMonthEarned,
    unlockDateLabel: formatIsraelDate(unlockOn),
    unlockOn,
  };
}
