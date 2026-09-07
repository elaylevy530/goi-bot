import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferCourierNotificationCategory,
  resolveCourierNotificationCategory,
} from "./courier-notification-category";

describe("inferCourierNotificationCategory", () => {
  it("classifies wallet, bonus, jobs, personal, and system", () => {
    assert.equal(inferCourierNotificationCategory({ title: "משיכה", link_url: "/courier/wallet" }), "wallet");
    assert.equal(inferCourierNotificationCategory({ title: "בונוס סוף שבוע" }), "bonus");
    assert.equal(inferCourierNotificationCategory({ title: "משלוח חדש", link_url: "/courier/new-jobs" }), "jobs");
    assert.equal(inferCourierNotificationCategory({ title: "שלום", audience: "single" }), "personal");
    assert.equal(inferCourierNotificationCategory({ title: "עדכון מערכת" }), "system");
  });
});

describe("resolveCourierNotificationCategory", () => {
  it("prefers explicit category except default system which still infers", () => {
    assert.equal(resolveCourierNotificationCategory({ category: "wallet", title: "בונוס" }), "wallet");
    assert.equal(resolveCourierNotificationCategory({ category: "system", title: "בונוס" }), "bonus");
  });
});
