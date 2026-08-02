/**
 * Server-side error handling utilities.
 * Used by createServerFn handlers and TanStack server routes (src/routes/api/*).
 *
 * Goals:
 * - Never leak internal error details to the client.
 * - Always return a structured JSON envelope: { error: { code, message } }.
 * - Always log the full error with a scope tag and optional context.
 */

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "config_missing"
  | "upstream_failed"
  | "internal";

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  config_missing: 500,
  upstream_failed: 502,
  internal: 500,
};

const DEFAULT_HE_MESSAGE: Record<ErrorCode, string> = {
  bad_request: "הבקשה לא תקינה",
  unauthorized: "נדרשת התחברות",
  forbidden: "אין הרשאה לפעולה זו",
  not_found: "לא נמצא",
  conflict: "פעולה זו אינה זמינה כרגע",
  rate_limited: "יותר מדי בקשות, נסה שוב בעוד רגע",
  config_missing: "תקלה זמנית בהגדרות המערכת",
  upstream_failed: "תקלה בשירות חיצוני, נסה שוב",
  internal: "אירעה שגיאה. נסה שוב בעוד רגע",
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  userMessage: string;
  cause?: unknown;

  constructor(
    code: ErrorCode,
    opts: { userMessage?: string; status?: number; cause?: unknown; internalMessage?: string } = {},
  ) {
    super(opts.internalMessage ?? opts.userMessage ?? DEFAULT_HE_MESSAGE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = opts.status ?? DEFAULT_STATUS[code];
    this.userMessage = opts.userMessage ?? DEFAULT_HE_MESSAGE[code];
    this.cause = opts.cause;
  }
}

/** Require an env var; throws config_missing AppError if absent. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new AppError("config_missing", {
      internalMessage: `Missing env: ${name}`,
    });
  }
  return v;
}

/** Throw an AppError when a query result has error or is empty (optional). */
export function ensureResult<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  scope: string,
): T {
  if (result.error) {
    throw new AppError("internal", {
      internalMessage: `[${scope}] query error: ${result.error.message}`,
      cause: result.error,
    });
  }
  if (result.data === null || result.data === undefined) {
    throw new AppError("not_found", { internalMessage: `[${scope}] no data` });
  }
  return result.data;
}

/** Compact, JSON-friendly structured log. */
export function logError(scope: string, err: unknown, ctx?: Record<string, unknown>) {
  const e = err as Error & { code?: string; cause?: unknown; status?: number };
  const payload = {
    scope,
    name: e?.name,
    message: e?.message,
    code: e?.code,
    status: e?.status,
    stack: e?.stack?.split("\n").slice(0, 6).join("\n"),
    cause: e?.cause ? String(e.cause) : undefined,
    ...ctx,
  };
  console.error(`[err:${scope}]`, JSON.stringify(payload));
}

/** Convert any error into a Response with structured JSON. */
export function toErrorResponse(scope: string, err: unknown): Response {
  logError(scope, err);
  if (err instanceof AppError) {
    return new Response(
      JSON.stringify({ error: { code: err.code, message: err.userMessage } }),
      {
        status: err.status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      },
    );
  }
  const msg = DEFAULT_HE_MESSAGE.internal;
  return new Response(JSON.stringify({ error: { code: "internal", message: msg } }), {
    status: 500,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Wrap an API route handler with try/catch + structured error response. */
export function withHandler<TCtx>(
  scope: string,
  fn: (ctx: TCtx) => Promise<Response> | Response,
): (ctx: TCtx) => Promise<Response> {
  return async (ctx: TCtx) => {
    try {
      return await fn(ctx);
    } catch (err) {
      return toErrorResponse(scope, err);
    }
  };
}

/** Run an async operation safely; log on failure, return fallback. */
export async function safeRun<T>(
  scope: string,
  fn: () => Promise<T>,
  fallback: T,
  ctx?: Record<string, unknown>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logError(scope, err, ctx);
    return fallback;
  }
}
