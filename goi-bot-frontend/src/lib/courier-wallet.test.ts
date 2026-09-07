import { describe, expect, it } from "vitest";
import { outcomeCourierPay, summarizeCourierWallet } from "./courier-wallet";

describe("courier wallet pay", () => {
  it("prefers suggested courier pay over job.payment", () => {
    expect(
      outcomeCourierPay({
        delivered_at: "2026-08-10T10:00:00.000Z",
        jobs: { suggested_courier_payment: 45, payment: 80 },
        tip_amount: 5,
      }),
    ).toBe(50);
  });
});

describe("courier wallet month split", () => {
  const now = new Date("2026-09-07T10:00:00.000Z");

  it("keeps current-month earnings locked until the 1st", () => {
    const summary = summarizeCourierWallet({
      now,
      outcomes: [
        { delivered_at: "2026-09-03T08:00:00.000Z", jobs: { suggested_courier_payment: 30 } },
        { delivered_at: "2026-08-20T08:00:00.000Z", jobs: { suggested_courier_payment: 70 } },
        { delivered_at: "2026-07-02T08:00:00.000Z", jobs: { payment: 20 } },
      ],
      withdrawals: [],
    });
    expect(summary.currentMonthEarned).toBe(30);
    expect(summary.unlockingAmount).toBe(30);
    expect(summary.unlockDateLabel).toMatch(/1/);
    expect(summary.previousEarned).toBe(90);
    expect(summary.available).toBe(90);
    expect(summary.closedMonths.map((m) => m.label).join(" ")).toMatch(/אוגוסט/);
    expect(summary.closedMonths.find((m) => m.key === "2026-08")?.earned).toBe(70);
    expect(summary.closedMonths.find((m) => m.key === "2026-07")?.earned).toBe(20);
  });

  it("subtracts paid and pending withdrawals from available closed-month pay", () => {
    const summary = summarizeCourierWallet({
      now,
      outcomes: [{ delivered_at: "2026-08-20T08:00:00.000Z", jobs: { suggested_courier_payment: 100 } }],
      withdrawals: [
        { amount: 40, status: "שולמה" },
        { amount: 25, status: "ממתינה" },
      ],
    });
    expect(summary.available).toBe(35);
    expect(summary.currentMonthEarned).toBe(0);
  });
});
