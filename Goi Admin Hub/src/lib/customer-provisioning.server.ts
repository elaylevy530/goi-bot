/**
 * Server-only helpers used by the WhatsApp bot / webhook handler to
 * auto-provision private customer accounts.
 *
 * DO NOT import from client-reachable modules. This file is server-only
 * (matches **\/*.server.ts blocklist).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function normalizePhoneServer(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function customerEmailFromPhone(raw: string): string {
  return `${normalizePhoneServer(raw)}@customers.goi.local`;
}

/**
 * Check if a phone belongs to a registered courier or business.
 * If neither, the caller should treat the sender as a private customer.
 */
export async function classifySenderPhone(rawPhone: string): Promise<
  | { kind: "courier"; id: string }
  | { kind: "business"; id: string; user_id: string | null }
  | { kind: "unknown"; phone: string }
> {
  const phone = normalizePhoneServer(rawPhone);
  const suffix9 = phone.slice(-9);

  const { data: courier } = await supabaseAdmin
    .from("couriers")
    .select("id, whatsapp_phone")
    .not("whatsapp_phone", "is", null);
  const courierMatch = (courier ?? []).find(
    (c) => (c.whatsapp_phone ?? "").replace(/\D/g, "").endsWith(suffix9),
  );
  if (courierMatch) return { kind: "courier", id: courierMatch.id as string };

  const { data: business } = await supabaseAdmin
    .from("customers")
    .select("id, user_id, phone")
    .not("phone", "is", null);
  const bizMatch = (business ?? []).find(
    (b) => (b.phone ?? "").replace(/\D/g, "").endsWith(suffix9),
  );
  if (bizMatch) {
    return {
      kind: "business",
      id: bizMatch.id as string,
      user_id: (bizMatch.user_id ?? null) as string | null,
    };
  }

  return { kind: "unknown", phone };
}

/**
 * Idempotently create a private-customer auth account for this phone.
 * Returns the user_id. If an account already exists it is returned as-is.
 *
 * The account uses the `@customers.goi.local` email suffix so the
 * customer panel's login gate recognizes it. A random password is set
 * so the account is complete; the user can request a reset if they
 * ever want to log in with a password.
 */
export async function ensureCustomerAccount(
  rawPhone: string,
  fullName?: string,
): Promise<{ user_id: string; email: string; phone: string; created: boolean }> {
  const phone = normalizePhoneServer(rawPhone);
  const email = customerEmailFromPhone(phone);

  // Search existing users (pagination-friendly up to 200 — enough for now)
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    return { user_id: existing.id, email, phone, created: false };
  }

  const randomPassword = `Goi-${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? phone,
      phone,
      role: "customer",
      provisioned_via: "whatsapp",
    },
  });
  if (error || !created?.user) {
    throw new Error(error?.message ?? "Failed to create customer account");
  }
  return { user_id: created.user.id, email, phone, created: true };
}
