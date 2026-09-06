import { describe, expect, it } from "vitest";
import { courierVehicleFitsJob } from "./courier-vehicle";
import {
  isCourierJobsRestricted,
  isCourierReceivingJobs,
  isJobSkippedAtCurrentPrice,
  jobOfferPay,
} from "./courier-live-jobs";

describe("job skip is per delivery, not per business", () => {
  it("reads courier pay from the job", () => {
    expect(jobOfferPay({ suggested_courier_payment: "32.5" })).toBe(32.5);
    expect(jobOfferPay({ payment: 20 })).toBe(20);
    expect(jobOfferPay({})).toBe(0);
  });

  it("hides only that job at the skipped price", () => {
    const skips = [{ job_id: "job-a", declined_price: 30 }];
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", payment: 30 }, skips)).toBe(true);
    expect(isJobSkippedAtCurrentPrice({ id: "job-b", payment: 30 }, skips)).toBe(false);
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", customer_id: "biz-1", payment: 30 }, skips)).toBe(true);
    expect(isJobSkippedAtCurrentPrice({ id: "job-c", customer_id: "biz-1", payment: 40 }, skips)).toBe(false);
  });

  it("brings the same job back only when its pay is higher", () => {
    const skips = [{ job_id: "job-a", declined_price: 30 }];
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", suggested_courier_payment: 30 }, skips)).toBe(true);
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", suggested_courier_payment: 29 }, skips)).toBe(true);
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", suggested_courier_payment: 31 }, skips)).toBe(false);
  });

  it("keeps a legacy skip hidden until a priced re-offer", () => {
    const skips = [{ job_id: "job-a", declined_price: null }];
    expect(isJobSkippedAtCurrentPrice({ id: "job-a", payment: 50 }, skips)).toBe(true);
  });
});

describe("courier receiving jobs vs restricted UI", () => {
  const live = { courier_status: "פעיל", accepting_jobs: true, is_paused: false };

  it("receives jobs when approved and available", () => {
    expect(isCourierReceivingJobs(live)).toBe(true);
    expect(isCourierJobsRestricted(live)).toBe(false);
  });

  it("hides jobs when admin blocked without treating the courier as offline", () => {
    const blocked = { ...live, admin_jobs_blocked: true };
    expect(isCourierReceivingJobs(blocked)).toBe(false);
    expect(isCourierJobsRestricted(blocked)).toBe(true);
  });

  it("hides jobs when paused", () => {
    const paused = { ...live, is_paused: true };
    expect(isCourierReceivingJobs(paused)).toBe(false);
    expect(isCourierJobsRestricted(paused)).toBe(true);
  });
});

describe("vehicle size hierarchy", () => {
  it("lets a car take motorcycle and bicycle jobs", () => {
    expect(courierVehicleFitsJob({ vehicle_required: "אופנוע" }, { vehicle_type: "רכב" })).toBe(true);
    expect(courierVehicleFitsJob({ vehicle_required: "אופניים" }, { vehicle_type: "רכב" })).toBe(true);
  });

  it("lets a motorcycle take bicycle jobs but not car jobs", () => {
    expect(courierVehicleFitsJob({ vehicle_required: "אופניים חשמליים" }, { vehicle_type: "קטנוע" })).toBe(true);
    expect(courierVehicleFitsJob({ vehicle_required: "רכב" }, { vehicle_type: "אופנוע" })).toBe(false);
  });

  it("blocks a motorcycle from oversized cargo like a pet-food sack", () => {
    expect(
      courierVehicleFitsJob(
        { vehicle_required: "אופנוע", item_category: "שק מזון חיות", package_size: "גדול" },
        { vehicle_type: "קטנוע" },
      ),
    ).toBe(false);
    expect(
      courierVehicleFitsJob(
        { item_category: "שק מזון חיות", package_size: "גדול" },
        { vehicle_type: "רכב" },
      ),
    ).toBe(true);
  });
});
