import { describe, expect, it } from "vitest";
import { isJobSkippedAtCurrentPrice, jobOfferPay } from "./courier-live-jobs";

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
