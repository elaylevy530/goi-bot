/**
 * Client-side error helpers. Show friendly Hebrew toasts; never leak raw
 * PostgREST / Supabase / fetch errors to end users.
 */
import { toast } from "sonner";

export type ServerErrorEnvelope = { error?: { code?: string; message?: string } };

const DEFAULT_HE = "אירעה שגיאה, נסה שוב בעוד רגע";

/** Best-effort extraction of a user-safe Hebrew message. */
export function extractErrorMessage(err: unknown, fallback = DEFAULT_HE): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  // Server envelope { error: { message } }
  const env = err as ServerErrorEnvelope;
  if (env?.error?.message) return env.error.message;

  const e = err as {
    message?: string;
    error_description?: string;
    hint?: string;
    details?: string;
    code?: string;
    name?: string;
  };

  // Supabase / PostgREST errors are often noisy; only show if Hebrew-ish or short
  const raw = e.error_description || e.message || e.details || e.hint;
  if (raw && typeof raw === "string") {
    // Hide internal jargon
    if (/jwt|JWT|token|RLS|policy|permission denied|violates|relation/i.test(raw)) {
      if (/permission denied|RLS|policy/i.test(raw)) return "אין הרשאה לפעולה זו";
      if (/jwt|token/i.test(raw)) return "ההתחברות פגה, אנא התחבר מחדש";
      return fallback;
    }
    if (/Failed to fetch|NetworkError|network/i.test(raw)) {
      return "תקלת רשת — בדוק את החיבור ונסה שוב";
    }
    return raw.length < 200 ? raw : fallback;
  }
  return fallback;
}

/** Show an error toast. Logs the original error to console. */
export function showError(err: unknown, fallback?: string): void {
  // eslint-disable-next-line no-console
  console.error("[ui-error]", err);
  toast.error(extractErrorMessage(err, fallback));
}

/** Fetch a server route that returns { error } envelopes; throws on non-OK. */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    throw new Error("תקלת רשת — בדוק את החיבור ונסה שוב");
  }
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) {
    const msg = (body && (body.error?.message || body.message)) || `שגיאה (${res.status})`;
    const e = new Error(msg) as Error & { status?: number; payload?: unknown };
    e.status = res.status;
    e.payload = body;
    throw e;
  }
  return body as T;
}
