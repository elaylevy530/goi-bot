/**
 * HTTP client for NestJS (goi-bot-backend).
 *
 * During the migration, TanStack createServerFn handlers remain the default
 * for most domains. Call `apiFetch` only for endpoints that have been moved
 * to Nest (see docs/API_CUTOVER.md).
 */

import { isNestPreviewReadOnly } from "@/lib/nest-preview-cache";

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  // Empty string → same-origin (Vite proxy). Absolute URL → direct Nest call.
  return (fromEnv ?? "").replace(/\/$/, "");
}

export type ApiErrorBody = {
  error: { code: string; message: string };
};

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export type ApiFetchOptions = RequestInit & {
  /** Bearer token for Nest-owned routes (Nest JWT from `nest-auth.ts`). */
  accessToken?: string | null;
};

export type BackendHealth = {
  ok: boolean;
  service: string;
  env: string;
  database: "up" | "down";
  synchronize: boolean;
  timestamp: string;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { accessToken, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  const method = (rest.method ?? "GET").toUpperCase();
  const isMutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  const isPreviewExit = path.includes("/api/auth/admin/preview/exit");
  if (isMutating && !isPreviewExit && isNestPreviewReadOnly()) {
    throw new ApiClientError(
      403,
      "preview_read_only",
      "מצב תצוגת מנהל הוא לקריאה בלבד. לא ניתן לבצע פעולות כתיבה.",
    );
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  // FormData must keep the browser-generated multipart boundary. Setting
  // application/json here makes Nest's FileInterceptor drop the file.
  if (rest.body && !headers.has("Content-Type") && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const base = apiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, { ...rest, headers });

  if (!res.ok) {
    let code = "internal";
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) message = body.error.message;
    } catch {
      // keep defaults
    }
    throw new ApiClientError(res.status, code, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** Phase 1 smoke helper — Nest health check. */
export function fetchBackendHealth() {
  return apiFetch<BackendHealth>("/api/health");
}
