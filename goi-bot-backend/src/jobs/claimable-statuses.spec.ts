import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLAIMABLE_STATUSES,
  HEBREW_OPEN_STATUSES,
  isClaimableStatus,
} from "./job-statuses";

/**
 * Guards the claim/accept UPDATE WHERE ↔ isClaimableStatus contract.
 * Run: `npx tsx --test src/jobs/claimable-statuses.spec.ts`
 */
describe("CLAIMABLE_STATUSES", () => {
  it("includes all canonical Hebrew open statuses", () => {
    for (const status of HEBREW_OPEN_STATUSES) {
      assert.equal(isClaimableStatus(status), true, `missing Hebrew status: ${status}`);
    }
  });

  it("includes legacy English open statuses so claim WHERE matches pre-check", () => {
    for (const status of ["pending", "awaiting_quotes", "open", "offered"]) {
      assert.equal(isClaimableStatus(status), true, `missing English status: ${status}`);
    }
  });

  it("does not include assigned/closed statuses", () => {
    for (const status of ["נבחר שליח", "פעילה", "הושלמה", "בוטלה", "טיוטה"]) {
      assert.equal(isClaimableStatus(status), false, `unexpected status: ${status}`);
    }
  });

  it("CLAIMABLE_STATUSES set is stable for UPDATE In([...])", () => {
    assert.deepEqual([...CLAIMABLE_STATUSES], [
      "נשלחה לשליחים",
      "ממתינה לתגובות",
      "יש שליחים שאישרו",
      "pending",
      "awaiting_quotes",
      "open",
      "offered",
    ]);
  });
});
