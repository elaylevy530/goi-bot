import { describe, expect, it } from "vitest";
import { isCompletedDelivery, ratingValue, summarizeCourierLiveStats } from "./courier-live-stats";

describe("courier live stats", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");

  it("counts only completed deliveries for ratings and monthly jobs", () => {
    const rows = [
      { delivered_at: "2026-09-03T10:00:00.000Z", was_cancelled: false, customer_rating: 5 },
      { delivered_at: "2026-09-04T10:00:00.000Z", was_cancelled: false, customer_rating: "4" },
      { delivered_at: "2026-08-20T10:00:00.000Z", was_cancelled: false, customer_rating: 5 },
      { delivered_at: "2026-09-05T10:00:00.000Z", was_cancelled: true, customer_rating: 1 },
      { delivered_at: null, was_cancelled: false, customer_rating: 5 },
    ];
    const stats = summarizeCourierLiveStats(rows, 3.2, now);
    expect(stats.ratingCount).toBe(3);
    expect(stats.avgRating).toBeCloseTo(14 / 3, 5);
    expect(stats.deliveriesThisMonth).toBe(2);
  });

  it("falls back to stored avg when no live ratings exist", () => {
    const stats = summarizeCourierLiveStats(
      [{ delivered_at: "2026-09-03T10:00:00.000Z", was_cancelled: false, customer_rating: null }],
      4.6,
      now,
    );
    expect(stats.avgRating).toBe(4.6);
    expect(stats.ratingCount).toBe(0);
    expect(stats.deliveriesThisMonth).toBe(1);
  });

  it("ignores cancelled and unrated rows for ratingValue", () => {
    expect(ratingValue({ delivered_at: "2026-09-03T10:00:00.000Z", was_cancelled: true, customer_rating: 5 })).toBeNull();
    expect(isCompletedDelivery({ delivered_at: "2026-09-03T10:00:00.000Z", was_cancelled: false })).toBe(true);
  });
});
