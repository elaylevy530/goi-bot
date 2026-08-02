/**
 * Server-only helpers for WhatsApp bot auto-provisioning.
 * Identity goes through Nest Auth.
 */

function nestApiBase(): string {
  const fromEnv =
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    "http://localhost:3001";
  return fromEnv.replace(/\/$/, "");
}

export function normalizePhoneServer(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function customerEmailFromPhone(raw: string): string {
  return `${normalizePhoneServer(raw)}@customers.goi.local`;
}

export type SenderClassification =
  | { kind: "courier"; id: string }
  | { kind: "business"; id: string; user_id: string | null }
  | { kind: "unknown"; phone: string };

/**
 * Classify sender phone via Nest accounts (CronSecret).
 * Falls back to unknown so ensureCustomerAccount can provision a private customer.
 */
export async function classifySenderPhone(
  rawPhone: string,
): Promise<SenderClassification> {
  const phone = normalizePhoneServer(rawPhone);
  const secret = process.env.CRON_SECRET;
  const base = nestApiBase();

  try {
    const res = await fetch(`${base}/api/accounts/classify-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret
          ? { Authorization: `Bearer ${secret}`, "X-Cron-Secret": secret }
          : {}),
      },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) {
      return (await res.json()) as SenderClassification;
    }
  } catch {
    // Nest classify endpoint may not be deployed yet.
  }

  return { kind: "unknown", phone };
}

/** Idempotent Nest private-customer provisioning. */
export async function ensureCustomerAccount(
  rawPhone: string,
  fullName?: string,
): Promise<{ user_id: string; email: string; phone: string; created: boolean }> {
  const phone = normalizePhoneServer(rawPhone);
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET required for ensureCustomerAccount");
  }

  const res = await fetch(`${nestApiBase()}/api/auth/ensure-customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "X-Cron-Secret": secret,
    },
    body: JSON.stringify({ phone, full_name: fullName }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `ensureCustomerAccount failed (${res.status})`);
  }

  return (await res.json()) as {
    user_id: string;
    email: string;
    phone: string;
    created: boolean;
  };
}
