import { describe, it, expect } from "vitest";
import {
  isCourierReceivingJobs,
  isOpenBroadcastJobForCourier,
  isOpenQuoteJobForCourier,
  isLivePendingOffer,
} from "@/lib/courier-live-jobs";

const activeCourier = {
  id: "c1",
  courier_status: "פעיל",
  is_paused: false,
  vehicle_type: "אופנוע",
  working_areas: ["כל הארץ"],
};

const suspendedCourier = { ...activeCourier, courier_status: "מושהה" };
const pausedCourier = { ...activeCourier, is_paused: true };
const pendingCourier = { ...activeCourier, courier_status: "ממתין לאישור" };
const blockedCourier = { ...activeCourier, courier_status: "חסום" };
const inactiveCourier = { ...activeCourier, courier_status: "לא פעיל" };

const openJob = {
  id: "j1",
  status: "נשלחה לשליחים",
  selected_courier_id: null,
  pricing_type: "fixed",
  vehicle_required: "אופנוע",
  pickup_area: "תל אביב",
  job_date: null,
};

const openQuoteJob = {
  ...openJob,
  pricing_type: "quote_request",
  selected_quote_id: null,
  quote_deadline_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

const pendingOffer = {
  id: "o1",
  response: "pending",
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  jobs: openJob,
};

describe("Suspended/non-active couriers cannot receive jobs", () => {
  for (const [label, courier] of [
    ["מושהה", suspendedCourier],
    ["paused", pausedCourier],
    ["ממתין לאישור", pendingCourier],
    ["חסום", blockedCourier],
    ["לא פעיל", inactiveCourier],
    ["null", null],
  ] as const) {
    describe(`courier=${label}`, () => {
      it("isCourierReceivingJobs → false", () => {
        expect(isCourierReceivingJobs(courier as never)).toBe(false);
      });
      it("isOpenBroadcastJobForCourier → false", () => {
        expect(isOpenBroadcastJobForCourier(openJob, courier as never)).toBe(false);
      });
      it("isOpenQuoteJobForCourier → false", () => {
        expect(isOpenQuoteJobForCourier(openQuoteJob, courier as never)).toBe(false);
      });
      it("isLivePendingOffer → false", () => {
        expect(isLivePendingOffer(pendingOffer, courier as never)).toBe(false);
      });
    });
  }

  it("Sanity: active courier DOES receive matching jobs", () => {
    expect(isCourierReceivingJobs(activeCourier)).toBe(true);
    expect(isOpenBroadcastJobForCourier(openJob, activeCourier)).toBe(true);
    expect(isOpenQuoteJobForCourier(openQuoteJob, activeCourier)).toBe(true);
    expect(isLivePendingOffer(pendingOffer, activeCourier)).toBe(true);
  });
});
