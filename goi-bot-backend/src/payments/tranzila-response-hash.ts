import { createHmac, timingSafeEqual } from "crypto";

/**
 * Tranzila Hosted Fields / notify `response_hash`:
 * HMAC-SHA256 of the response with `response_hash` removed, keyed by the merchant secret.
 * Docs: https://docs.tranzila.com/docs/payments-and-billing/hosted-fields
 * PHP sample: hash_hmac('sha256', $payload, $secret, false)
 */
export function verifyTranzilaResponseHash(
  body: Record<string, unknown>,
  secret: string,
): boolean {
  if (!secret) return false;
  const received = pickHash(body);
  if (!received) return false;

  const rest = omitHash(body);
  for (const payload of payloads(rest)) {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (safeEqualHex(received, expected)) return true;
  }
  return false;
}

function pickHash(body: Record<string, unknown>): string {
  for (const [k, v] of Object.entries(body)) {
    if (k.toLowerCase() !== "response_hash") continue;
    if (typeof v === "string" || typeof v === "number") return String(v).trim();
  }
  return "";
}

function omitHash(body: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k.toLowerCase() === "response_hash") continue;
    rest[k] = v;
  }
  return rest;
}

function payloads(rest: Record<string, unknown>): string[] {
  const json = JSON.stringify(rest);
  const jsonSorted = JSON.stringify(sortKeys(rest));
  const valuesSorted = Object.keys(rest)
    .sort()
    .map((k) => scalar(rest[k]))
    .join("");
  return [...new Set([json, jsonSorted, valuesSorted].filter(Boolean))];
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]));
  }
  return value;
}

function scalar(v: unknown): string {
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (v == null) return "";
  return JSON.stringify(v);
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  return left.length === right.length && timingSafeEqual(left, right);
}
