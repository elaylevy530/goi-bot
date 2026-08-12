/**
 * Canonical Hebrew open statuses used by courier inbox / claim happy-path.
 * Prefer these end-to-end; English legacy values remain claimable during migration.
 */
export const HEBREW_OPEN_STATUSES = [
  "נשלחה לשליחים",
  "ממתינה לתגובות",
  "יש שליחים שאישרו",
] as const;

/** Legacy English open statuses that may still appear on older Nest-created rows. */
export const LEGACY_ENGLISH_OPEN_STATUSES = [
  "pending",
  "awaiting_quotes",
  "open",
  "offered",
] as const;

/**
 * Statuses under which a job is still "open" to couriers (not yet assigned).
 */
export const OPEN_STATUSES = [
  ...LEGACY_ENGLISH_OPEN_STATUSES,
  ...HEBREW_OPEN_STATUSES,
] as const;

/**
 * Must stay identical between `isClaimableStatus` pre-check and claim/accept UPDATE WHERE.
 * Mismatch causes false `{ ok:false, reason:"taken" }` when status is English-open.
 */
export const CLAIMABLE_STATUSES = [
  ...HEBREW_OPEN_STATUSES,
  ...LEGACY_ENGLISH_OPEN_STATUSES,
] as const;

export function isClaimableStatus(status: string): boolean {
  return (CLAIMABLE_STATUSES as readonly string[]).includes(status);
}
