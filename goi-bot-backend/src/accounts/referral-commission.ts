export const REFERRAL_COMMISSION_ILS = 1.5;

export type ReferralCommissionKind = "courier" | "business";

export type ReferralCreditPlan = {
  kind: ReferralCommissionKind;
  beneficiaryId: string;
  sourceCourierId: string | null;
  sourceCustomerId: string | null;
};

/** Who earns ₪1.50 on a completed job. Same referrer on both sides → two rows (₪3). */
export function referralCreditsForJob(input: {
  workerId: string | null;
  workerReferredBy: string | null;
  businessId: string | null;
  businessReferredBy: string | null;
}): ReferralCreditPlan[] {
  const credits: ReferralCreditPlan[] = [];
  const workerId = input.workerId?.trim() || null;
  const workerReferredBy = input.workerReferredBy?.trim() || null;
  const businessId = input.businessId?.trim() || null;
  const businessReferredBy = input.businessReferredBy?.trim() || null;

  if (workerId && workerReferredBy && workerReferredBy !== workerId) {
    credits.push({
      kind: "courier",
      beneficiaryId: workerReferredBy,
      sourceCourierId: workerId,
      sourceCustomerId: null,
    });
  }

  if (businessId && businessReferredBy) {
    credits.push({
      kind: "business",
      beneficiaryId: businessReferredBy,
      sourceCourierId: workerId,
      sourceCustomerId: businessId,
    });
  }

  return credits;
}

const ISRAEL_TZ = "Asia/Jerusalem";

export function israelYearMonthValue(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return year * 12 + month;
}

export function isCurrentIsraelMonth(d: Date, now = new Date()): boolean {
  return israelYearMonthValue(d) === israelYearMonthValue(now);
}
