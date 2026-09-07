import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveJobTiming, timelineFromStatusLogs } from "./job-timing";

describe("timelineFromStatusLogs", () => {
  it("picks the first heading / pickup / delivery steps", () => {
    const t = timelineFromStatusLogs([
      { new_status: "נשלחה לשליחים", created_at: "2026-09-07T08:00:00.000Z" },
      { new_status: "בדרך לאיסוף", created_at: "2026-09-07T08:10:00.000Z" },
      { new_status: "אספתי", created_at: "2026-09-07T08:18:00.000Z" },
      { new_status: "נמסר", created_at: "2026-09-07T08:40:00.000Z" },
    ]);
    assert.equal(t.heading_to_pickup_at, "2026-09-07T08:10:00.000Z");
    assert.equal(t.picked_up_at, "2026-09-07T08:18:00.000Z");
    assert.equal(t.delivered_at, "2026-09-07T08:40:00.000Z");
  });
});

describe("resolveJobTiming", () => {
  it("falls back to accepted_at when heading was never stamped", () => {
    const t = resolveJobTiming(
      { accepted_at: "2026-09-07T08:05:00.000Z", picked_up_at: "2026-09-07T08:20:00.000Z" },
      { delivered_at: "2026-09-07T08:50:00.000Z" },
      [],
    );
    assert.equal(t.heading_to_pickup_at, "2026-09-07T08:05:00.000Z");
    assert.equal(t.picked_up_at, "2026-09-07T08:20:00.000Z");
    assert.equal(t.delivered_at, "2026-09-07T08:50:00.000Z");
  });

  it("fills missing job timestamps from status logs", () => {
    const t = resolveJobTiming({ accepted_at: "2026-09-07T08:00:00.000Z" }, null, [
      { new_status: "בדרך לאיסוף", created_at: "2026-09-07T08:04:00.000Z" },
      { new_status: "אספתי", created_at: "2026-09-07T08:12:00.000Z" },
      { new_status: "נמסר", created_at: "2026-09-07T08:30:00.000Z" },
    ]);
    assert.equal(t.heading_to_pickup_at, "2026-09-07T08:04:00.000Z");
    assert.equal(t.picked_up_at, "2026-09-07T08:12:00.000Z");
    assert.equal(t.delivered_at, "2026-09-07T08:30:00.000Z");
  });
});
