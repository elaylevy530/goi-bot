/**
 * Mirrors goi-bot-frontend/src/lib/server-errors.ts AppError semantics
 * so migrated endpoints can keep the same { error: { code, message } } envelope.
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
    opts: {
      userMessage?: string;
      status?: number;
      cause?: unknown;
      internalMessage?: string;
    } = {},
  ) {
    super(opts.internalMessage ?? opts.userMessage ?? DEFAULT_HE_MESSAGE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = opts.status ?? DEFAULT_STATUS[code];
    this.userMessage = opts.userMessage ?? DEFAULT_HE_MESSAGE[code];
    this.cause = opts.cause;
  }
}
