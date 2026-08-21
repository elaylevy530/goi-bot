/** Structured PayPal logs. Failures go to console.error so Netlify `--level error` captures them. */

export function paypalLog(
  event: string,
  data: Record<string, unknown> = {},
  level: "error" | "info" = "error",
): void {
  const line = JSON.stringify({ tag: "paypal", event, ts: new Date().toISOString(), ...data });
  if (level === "info") console.log(line);
  else console.error(line);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function paypalErrorFields(body: unknown): Record<string, unknown> {
  const rec = asRecord(body);
  if (!rec) return { body: String(body).slice(0, 400) };
  const details = Array.isArray(rec.details)
    ? rec.details.map((d) => {
        const row = asRecord(d);
        return {
          issue: row?.issue,
          description: row?.description,
          field: row?.field,
        };
      })
    : undefined;
  return {
    name: rec.name,
    message: rec.message,
    debug_id: rec.debug_id,
    details,
  };
}
