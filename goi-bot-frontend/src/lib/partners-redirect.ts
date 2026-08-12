import { externalApps } from "@/lib/external-apps";
import { getNestAccessToken } from "@/lib/nest-auth";

/**
 * Absolute URL on the goi-partners app for a path (e.g. `/join`).
 * Courier ops (`/courier/*`, `/courier-login`, `/courier-reset-password`) live in
 * this product shell again — use in-app routes for those. Keep partners redirects
 * for marketing / join surfaces only.
 */
export function partnersUrl(path = "/"): string {
  const base = externalApps.partners.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Soft redirect helper for marketing bookmarks → partners domain. */
export function redirectToPartners(path: string): void {
  if (typeof window === "undefined") return;
  window.location.replace(partnersUrl(path));
}

/**
 * Open partners with a one-time Nest JWT handoff (cross-origin localStorage).
 * Partners strips the query param after storing `goi_nest_access_token`.
 * Prefer in-app navigation for courier ops; use this for join/marketing only.
 */
export function redirectToPartnersWithSession(
  path: string,
  tokenParam: "access_token" | "preview_token" = "access_token",
): void {
  if (typeof window === "undefined") return;
  const token = getNestAccessToken();
  const url = new URL(partnersUrl(path));
  if (token) url.searchParams.set(tokenParam, token);
  window.location.replace(url.toString());
}
