import { setNestAccessToken } from "@/lib/nest-auth";

/**
 * Accept a one-time Nest JWT from a sibling app (partners join / login handoff)
 * via `?access_token=` or `?preview_token=`, then strip it from the URL.
 */
export function consumeTokenHandoffFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const token =
      url.searchParams.get("access_token") ||
      url.searchParams.get("preview_token");
    if (!token?.trim()) return;
    setNestAccessToken(token.trim());
    url.searchParams.delete("access_token");
    url.searchParams.delete("preview_token");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  } catch {
    // ignore
  }
}
