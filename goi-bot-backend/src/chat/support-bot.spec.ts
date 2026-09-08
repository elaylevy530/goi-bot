import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { replyToSupport } from "./support-bot";

describe("support bot", () => {
  it("hands off when the courier asks for a human", () => {
    const r = replyToSupport("נציג אנושי");
    assert.equal(r.handoff, true);
    assert.match(r.reply, /נציג/);
  });

  it("answers wallet questions without a handoff", () => {
    const r = replyToSupport("תשלום וארנק");
    assert.equal(r.handoff, false);
    assert.match(r.reply, /ארנק/);
  });

  it("falls back on unknown text", () => {
    const r = replyToSupport("שלום מה נשמע");
    assert.equal(r.handoff, false);
    assert.match(r.reply, /נציג אנושי/);
  });
});
