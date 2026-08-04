import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  phoneLookupCandidates,
} from "@/lib/courier-password-reset.functions";

describe("normalizePhone", () => {
  it("converts local 0xxxxxxxxx to 972xxxxxxxxx", () => {
    expect(normalizePhone("0509810022")).toBe("972509810022");
  });
  it("keeps international 972xxxxxxxxx as-is", () => {
    expect(normalizePhone("972509810022")).toBe("972509810022");
  });
  it("strips +, spaces and dashes", () => {
    expect(normalizePhone("+972-50-981-0022")).toBe("972509810022");
    expect(normalizePhone("050-981 0022")).toBe("972509810022");
  });
  it("adds 972 prefix to a bare 9-digit number", () => {
    expect(normalizePhone("509810022")).toBe("972509810022");
  });
});

describe("phoneLookupCandidates", () => {
  it("returns both international and local forms for an Israeli number", () => {
    const cands = phoneLookupCandidates("972509810022");
    expect(cands).toContain("972509810022");
    expect(cands).toContain("0509810022");
  });

  it("matches couriers stored in local format when user enters international", () => {
    const stored = "0509810022";
    const normalized = normalizePhone("+972509810022");
    expect(phoneLookupCandidates(normalized)).toContain(stored);
  });

  it("matches couriers stored in international format when user enters local", () => {
    const stored = "972509810022";
    const normalized = normalizePhone("0509810022");
    expect(phoneLookupCandidates(normalized)).toContain(stored);
  });

  it("matches when user and storage use the same local format", () => {
    const stored = "0509810022";
    const normalized = normalizePhone("0509810022");
    // After normalization the user input is 972..., so we must include the
    // local form in the lookup candidates for the match to succeed.
    expect(phoneLookupCandidates(normalized)).toContain(stored);
  });
});
