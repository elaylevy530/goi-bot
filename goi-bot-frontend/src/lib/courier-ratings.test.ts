import { describe, expect, it } from "vitest";
import { deliveryMins, pickupMins } from "./courier-ratings";

describe("courier ratings timing", () => {
  it("uses heading → pickup for average pickup time", () => {
    expect(
      pickupMins({
        jobs: {
          heading_to_pickup_at: "2026-09-07T08:10:00.000Z",
          picked_up_at: "2026-09-07T08:22:00.000Z",
        },
      }),
    ).toBe(12);
  });

  it("falls back to accepted_at when heading is missing", () => {
    expect(
      pickupMins({
        picked_up_at: "2026-09-07T08:20:00.000Z",
        jobs: {
          accepted_at: "2026-09-07T08:05:00.000Z",
        },
      }),
    ).toBe(15);
  });

  it("uses pickup → delivered for average delivery time", () => {
    expect(
      deliveryMins({
        delivered_at: "2026-09-07T09:00:00.000Z",
        jobs: {
          picked_up_at: "2026-09-07T08:40:00.000Z",
        },
      }),
    ).toBe(20);
  });
});
