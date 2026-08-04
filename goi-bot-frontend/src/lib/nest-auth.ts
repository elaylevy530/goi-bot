/**
 * Product auth adapter — Nest JWT + Postgres only.
 *
 * Nest owns signup, login, and sessions.
 * See docs/API_CUTOVER.md.
 */

import { apiFetch } from "@/lib/api-client";
import {
  clearNestPreviewCache,
  getCachedNestPreview,
  isNestPreviewReadOnly,
  setNestPreviewCache,
  type CachedNestPreview,
} from "@/lib/nest-preview-cache";

const NEST_TOKEN_KEY = "goi_nest_access_token";

export type PreviewPanel = "courier" | "business" | "customer";

export type NestAuthPreview = CachedNestPreview;

export { getCachedNestPreview, isNestPreviewReadOnly };

export type NestAuthProfile = {
  customerId?: string;
  courierId?: string;
  name?: string | null;
  phone?: string | null;
  businessName?: string | null;
  businessNiche?: string | null;
  customerType?: string | null;
  logoUrl?: string | null;
  courierStatus?: string | null;
};

export type NestAuthUser = {
  userId: string;
  email: string | null;
  roles: string[];
  profile?: NestAuthProfile;
  preview?: NestAuthPreview;
};

export type NestAuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  roles: string[];
  profile: NestAuthProfile;
  preview?: NestAuthPreview;
};

export type NestAdminPing = {
  ok: boolean;
  userId: string;
  roles: string[];
};

export type NestCustomerProfile = Record<string, unknown> & {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  customer_type?: string | null;
  business_name?: string | null;
  business_niche?: string | null;
  logo_url?: string | null;
};

export type NestCourierProfile = Record<string, unknown> & {
  id: string;
  user_id: string | null;
  full_name: string;
  whatsapp_phone: string;
  courier_status?: string;
  courier_kind?: string | null;
};

/** Normalize Israeli phone digits to 972… (shared with Nest). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function phoneToRoleEmail(
  phone: string,
  role: "customer" | "business" | "courier",
): string {
  const normalized = normalizePhone(phone);
  if (role === "customer") return `${normalized}@customers.goi.local`;
  if (role === "business") return `${normalized}@business.goi.local`;
  return `${normalized}@couriers.goi.local`;
}

export function getNestAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(NEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setNestAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEST_TOKEN_KEY, token);
}

export function clearNestAccessToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NEST_TOKEN_KEY);
  } catch {
    // ignore
  }
  clearNestPreviewCache();
}

function persistSession(session: NestAuthSession): NestAuthSession {
  setNestAccessToken(session.accessToken);
  setNestPreviewCache(session.preview);
  return session;
}

export function nestRegister(email: string, password: string) {
  return apiFetch<NestAuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(persistSession);
}

export function nestRegisterCustomer(input: {
  full_name: string;
  phone: string;
  password: string;
}) {
  return apiFetch<NestAuthSession>("/api/auth/register/customer", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(persistSession);
}

export function nestRegisterBusiness(input: {
  full_name: string;
  business_name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  password: string;
  business_niche?: string;
  business_category: string;
  service_type: string;
  terms_accepted: true;
}) {
  return apiFetch<NestAuthSession>("/api/auth/register/business", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(persistSession);
}

export function nestLogin(email: string, password: string) {
  return apiFetch<NestAuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(persistSession);
}

/** Phone login for customer / business / courier synthetic Nest emails. */
export function nestLoginWithPhone(
  phone: string,
  password: string,
  role: "customer" | "business" | "courier",
) {
  return nestLogin(phoneToRoleEmail(phone, role), password);
}

export function nestMe(accessToken = getNestAccessToken()) {
  return apiFetch<NestAuthUser>("/api/auth/me", { accessToken }).then((me) => {
    setNestPreviewCache(me.preview);
    return me;
  });
}

/** Admin/manager: open a product panel as read-only preview for an entity. */
export function nestStartPreview(panel: PreviewPanel, entityId: string) {
  return apiFetch<NestAuthSession>("/api/auth/admin/preview", {
    method: "POST",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ panel, entityId }),
  }).then(persistSession);
}

/** Exit preview and restore a normal admin/manager JWT. */
export function nestExitPreview() {
  return apiFetch<NestAuthSession>("/api/auth/admin/preview/exit", {
    method: "POST",
    accessToken: getNestAccessToken(),
  }).then(persistSession);
}

export function nestPreviewHomePath(panel: PreviewPanel): string {
  if (panel === "courier") return "/courier/new-jobs";
  if (panel === "business") return "/business/dashboard";
  return "/customer/dashboard";
}

export function nestMyCustomer(accessToken = getNestAccessToken()) {
  return apiFetch<NestCustomerProfile | null>("/api/auth/me/customer", {
    accessToken,
  });
}

export function nestUpdateCustomerProfile(full_name: string) {
  return apiFetch<{ ok: true; name: string }>("/api/auth/me/customer", {
    method: "PATCH",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ full_name }),
  });
}

export function nestMyCourier(accessToken = getNestAccessToken()) {
  return apiFetch<NestCourierProfile | null>("/api/auth/me/courier", {
    accessToken,
  });
}

export function nestAdminPing(accessToken = getNestAccessToken()) {
  return apiFetch<NestAdminPing>("/api/auth/admin-ping", { accessToken });
}

/** Self-service password update (Nest JWT session). */
export function nestUpdatePassword(newPassword: string) {
  return apiFetch<{ ok: true }>("/api/auth/password", {
    method: "PATCH",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ newPassword }),
  });
}

export function nestRegisterCourier(input: Record<string, unknown>) {
  return apiFetch<{ id: string; accountCreated: boolean }>(
    "/api/auth/register/courier",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function nestProvisionCourier(id: string) {
  return apiFetch<{
    email: string;
    tempPassword: string;
    login_phone: string;
  }>("/api/auth/admin/provision-courier", {
    method: "POST",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ id }),
  });
}

export function nestRequestCourierPasswordReset(phone: string) {
  return apiFetch<{ ok: true; throttled?: boolean }>(
    "/api/auth/courier/password-reset/request",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    },
  );
}

export function nestConfirmCourierPasswordReset(input: {
  phone: string;
  code: string;
  newPassword: string;
}) {
  return apiFetch<{ ok: boolean; error?: string }>(
    "/api/auth/courier/password-reset/confirm",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function nestLogout(): void {
  clearNestAccessToken();
}

/** Resolve current Nest session or null (clears bad tokens). */
export async function fetchNestSession(): Promise<NestAuthUser | null> {
  const token = getNestAccessToken();
  if (!token) return null;
  try {
    return await nestMe(token);
  } catch {
    clearNestAccessToken();
    return null;
  }
}

export function isPreviewSession(
  session: NestAuthUser | NestAuthSession | null | undefined,
  panel?: PreviewPanel,
): boolean {
  if (!session?.preview?.readOnly) return false;
  if (!panel) return true;
  return session.preview.panel === panel;
}

export function nestHomePath(user: NestAuthUser): string {
  const roles = user.roles ?? [];
  if (roles.includes("admin") || roles.includes("manager")) return "/dashboard";
  if (roles.includes("courier")) return "/courier/new-jobs";
  if (roles.includes("business")) {
    const niche = user.profile?.businessNiche ?? "manual_dispatch";
    if (niche === "restaurant") return "/restaurant";
    if (niche === "online_store") return "/store";
    if (niche === "pharmacy_clinic") return "/clinic";
    return "/business/dashboard";
  }
  if (roles.includes("customer")) return "/customer/dashboard";
  return "/dashboard";
}
