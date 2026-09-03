import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { referralCreditsForJob } from "./referral-commission";

describe("referralCreditsForJob", () => {
  it("pays when the completing courier was referred", () => {
    assert.deepEqual(
      referralCreditsForJob({
        workerId: "courier-a",
        workerReferredBy: "referrer",
        businessId: "biz",
        businessReferredBy: null,
      }),
      [
        {
          kind: "courier",
          beneficiaryId: "referrer",
          sourceCourierId: "courier-a",
          sourceCustomerId: null,
        },
      ],
    );
  });

  it("pays when the dispatching business was referred", () => {
    assert.deepEqual(
      referralCreditsForJob({
        workerId: "courier-a",
        workerReferredBy: null,
        businessId: "biz",
        businessReferredBy: "referrer",
      }),
      [
        {
          kind: "business",
          beneficiaryId: "referrer",
          sourceCourierId: "courier-a",
          sourceCustomerId: "biz",
        },
      ],
    );
  });

  it("stacks when the same referrer recruited both sides", () => {
    const credits = referralCreditsForJob({
      workerId: "courier-a",
      workerReferredBy: "referrer",
      businessId: "biz",
      businessReferredBy: "referrer",
    });
    assert.equal(credits.length, 2);
    assert.deepEqual(credits.map((c) => c.kind).sort(), ["business", "courier"]);
    assert.deepEqual([...new Set(credits.map((c) => c.beneficiaryId))], ["referrer"]);
  });

  it("does not pay a courier for completing as their own referred worker", () => {
    assert.deepEqual(
      referralCreditsForJob({
        workerId: "courier-a",
        workerReferredBy: "courier-a",
        businessId: "biz",
        businessReferredBy: null,
      }),
      [],
    );
  });
});
