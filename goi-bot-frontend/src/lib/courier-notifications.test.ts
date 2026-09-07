import { describe, expect, it } from "vitest";
import {
  inferCourierNotificationCategory,
  resolveCourierNotificationCategory,
} from "./courier-notifications";

describe("inferCourierNotificationCategory", () => {
  it("classifies wallet links and withdrawal copy", () => {
    expect(inferCourierNotificationCategory({ title: "משיכה אושרה", link_url: "/courier/wallet" })).toBe("wallet");
  });

  it("classifies bonus copy", () => {
    expect(inferCourierNotificationCategory({ title: "בונוס סוף שבוע", body: "50 ש״ח" })).toBe("bonus");
  });

  it("classifies job updates", () => {
    expect(inferCourierNotificationCategory({ title: "שינוי במשלוחים", link_url: "/courier/active" })).toBe("jobs");
  });

  it("classifies personal audience when content is generic", () => {
    expect(inferCourierNotificationCategory({ title: "שלום", audience: "single", courier_id: "abc" })).toBe("personal");
  });

  it("falls back to system", () => {
    expect(inferCourierNotificationCategory({ title: "עדכון מערכת" })).toBe("system");
  });
});

describe("resolveCourierNotificationCategory", () => {
  it("keeps an explicit non-system category", () => {
    expect(resolveCourierNotificationCategory({ category: "wallet", title: "בונוס" })).toBe("wallet");
  });

  it("infers when stored category is system", () => {
    expect(resolveCourierNotificationCategory({ category: "system", title: "בונוס סוף שבוע" })).toBe("bonus");
  });
});
