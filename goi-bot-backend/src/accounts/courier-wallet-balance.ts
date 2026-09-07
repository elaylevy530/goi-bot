const ISRAEL_TZ = "Asia/Jerusalem";

export type WalletJobRef = {
  payment?: unknown;
  suggested_courier_payment?: unknown;
  per_job_amount?: unknown;
  customer_price?: unknown;
  delivered_at?: Date | string | null;
  created_at?: Date | string | null;
  job_date?: Date | string | null;
  status?: string | null;
  delivery_status?: string | null;
};

export type WalletOutcome = {
  delivered_at?: Date | string | null;
  created_at?: Date | string | null;
  was_cancelled?: boolean | null;
  tip_amount?: unknown;
  jobs?: WalletJobRef | WalletJobRef[] | null;
};

export type WalletCommission = {
  amount?: unknown;
  created_at?: Date | string | null;
  walleted_at?: Date | string | null;
};

export type WalletWithdrawal = {
  amount?: unknown;
  status?: string | null;
};

function israelCalendarParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: num("year"), month: num("month"), day: num("day") };
}

export function israelYearMonthKey(iso?: Date | string | null) {
  if (iso == null || iso === "") return null;
  if (typeof iso === "string") {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    if (ymd && !iso.includes("T")) return `${ymd[1]}-${ymd[2]}`;
  }
  const at = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const { year, month } = israelCalendarParts(at);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentIsraelYearMonthKey(now = new Date()) {
  const { year, month } = israelCalendarParts(now);
  return `${year}-${String(month).padStart(2, "0")}`;
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

function outcomeJob(outcome: WalletOutcome): WalletJobRef | null {
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
  return job?.job_date || outcome.delivered_at || job?.delivered_at || outcome.created_at || job?.created_at || null;
}

export function outcomeCourierPay(outcome: WalletOutcome) {
  const job = outcomeJob(outcome);
  const row = Array.isArray(job) ? job[0] : job;
  let pay = 0;
  for (const value of [row?.suggested_courier_payment, row?.payment, row?.per_job_amount, row?.customer_price]) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      pay = n;
      break;
    }
  }
  return pay + (Number(outcome.tip_amount ?? 0) || 0);
}

export function withdrawableBalance({
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
  const currentKey = currentIsraelYearMonthKey(now);
  let previousEarned = 0;
  for (const o of outcomes.filter(isWalletCompletedOutcome)) {
    const key = israelYearMonthKey(outcomeEarnedAt(o));
    if (key && key < currentKey) previousEarned += outcomeCourierPay(o);
  }
  for (const c of commissions) {
    if (c.walleted_at == null) continue;
    const key = israelYearMonthKey(c.created_at);
    if (key && key < currentKey) previousEarned += Number(c.amount ?? 0) || 0;
  }
  const paidOut = withdrawals
    .filter((w) => isPaidWithdrawal(w.status))
    .reduce((s, w) => s + Number(w.amount ?? 0), 0);
  const reserved = withdrawals
    .filter((w) => isOpenWithdrawal(w.status))
    .reduce((s, w) => s + Number(w.amount ?? 0), 0);
  return Math.max(0, previousEarned - paidOut - reserved);
}
