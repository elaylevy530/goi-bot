export function nestApiBase(): string {
  const fromEnv =
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    "http://localhost:3001";
  return fromEnv.replace(/\/$/, "");
}

export type NestServerFetchOptions = {
  accessToken?: string;
  /** When true, send CRON_SECRET as Bearer + X-Cron-Secret (CronSecretGuard). */
  cronSecret?: boolean;
  method?: string;
  body?: unknown;
};

export async function nestServerFetch<T = unknown>(
  path: string,
  opts: NestServerFetchOptions = {},
): Promise<T> {
  const url = `${nestApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.cronSecret) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new Error("CRON_SECRET required for Nest cron-authenticated request");
    }
    headers.Authorization = `Bearer ${secret}`;
    headers["X-Cron-Secret"] = secret;
  } else if (opts.accessToken) {
    headers.Authorization = `Bearer ${opts.accessToken}`;
  }

  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[]; error?: string };
      const m = parsed.message;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? parsed.error ?? text);
    } catch {
      /* use raw text */
    }
    throw new Error(msg || `Nest request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as T;
}
