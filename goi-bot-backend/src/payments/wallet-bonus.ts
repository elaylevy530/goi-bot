/** Prepaid wallet bonus ladders — must match goi-bot-frontend/src/routes/business.wallet.tsx */
const TIERS = [
  { min: 1000, pct: 18 },
  { min: 500, pct: 12 },
  { min: 300, pct: 8 },
  { min: 100, pct: 5 },
] as const;

export function walletBonus(amount: number): { pct: number; bonusVal: number } {
  const pct = TIERS.find((t) => amount >= t.min)?.pct ?? 0;
  return { pct, bonusVal: Math.floor((amount * pct) / 100) };
}
