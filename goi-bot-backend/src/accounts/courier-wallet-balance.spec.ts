import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { israelYearMonthKey, withdrawableBalance } from "./courier-wallet-balance";

const now = new Date("2026-09-07T10:00:00.000Z");

describe("israelYearMonthKey", () => {
  it("keeps DATE-only job_date in its calendar month", () => {
    assert.equal(israelYearMonthKey("2026-08-31"), "2026-08");
    assert.equal(israelYearMonthKey("2026-09-01"), "2026-09");
  });
});

describe("withdrawableBalance", () => {
  it("unlocks August job_date pay in September even if delivered later", () => {
    const available = withdrawableBalance({
      now,
      outcomes: [
        {
          delivered_at: "2026-09-02T08:00:00.000Z",
          jobs: { status: "הושלמה", job_date: "2026-08-28", suggested_courier_payment: 236 },
        },
      ],
      withdrawals: [],
    });
    assert.equal(available, 236);
  });

  it("counts a completed job without an outcome courier_id via the nested job", () => {
    const available = withdrawableBalance({
      now,
      outcomes: [
        {
          jobs: { status: "הושלמה", job_date: "2026-08-12", payment: 55 },
        },
      ],
    });
    assert.equal(available, 55);
  });

  it("subtracts pending withdrawals", () => {
    const available = withdrawableBalance({
      now,
      outcomes: [{ delivered_at: "2026-08-20T08:00:00.000Z", jobs: { suggested_courier_payment: 100 } }],
      withdrawals: [
        { amount: 40, status: "שולמה" },
        { amount: 25, status: "ממתינה" },
      ],
    });
    assert.equal(available, 35);
  });
});
