import { describe, expect, it } from "vitest";
import { isLiveGpsFix, isLocationActiveFromSignals } from "@/lib/courier-location";

describe("isLiveGpsFix", () => {
  it("is true only with a granted permission and a real fix", () => {
    expect(isLiveGpsFix({ permission: "granted", error: null, lastFixAt: Date.now() })).toBe(true);
    expect(isLiveGpsFix({ permission: "granted", error: null, lastFixAt: null })).toBe(false);
    expect(isLiveGpsFix({ permission: "denied", error: null, lastFixAt: Date.now() })).toBe(false);
    expect(isLiveGpsFix({ permission: "prompt", error: null, lastFixAt: null })).toBe(false);
  });
});

describe("isLocationActiveFromSignals", () => {
  it("treats a live fix or granted permission as active", () => {
    expect(isLocationActiveFromSignals({ liveFix: true, permission: "prompt", sharingEnabled: false })).toBe(true);
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "granted", sharingEnabled: false })).toBe(true);
  });

  it("treats prompt, denied and unsupported as not active", () => {
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "prompt", sharingEnabled: true })).toBe(false);
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "denied", sharingEnabled: true })).toBe(false);
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "unsupported", sharingEnabled: true })).toBe(false);
  });

  it("detects browser permission-denied GPS errors", async () => {
    const { isGpsPermissionDenied } = await import("@/lib/courier-location");
    expect(isGpsPermissionDenied({ code: 1 })).toBe(true);
    expect(isGpsPermissionDenied({ code: 2 })).toBe(false);
    expect(isGpsPermissionDenied({ code: 3 })).toBe(false);
  });

  it("falls back to sharing only when the browser cannot report permission", () => {
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "unknown", sharingEnabled: true })).toBe(true);
    expect(isLocationActiveFromSignals({ liveFix: false, permission: "unknown", sharingEnabled: false })).toBe(false);
  });
});
