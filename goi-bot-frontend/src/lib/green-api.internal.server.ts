/**
 * Green API client — server only. Internal implementation; do NOT import
 * directly from app code. Use ./green-api.server (facade) or
 * ./whatsapp/provider.server (multi-provider) instead.
 * Docs: https://green-api.com/en/docs/api/
 */

type ButtonRow = { buttonId: string; buttonText: string };

function creds() {
  const id = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!id || !token) throw new Error("GREEN_API credentials missing");
  const prefix = id.substring(0, 4);
  const base = `https://${prefix}.api.green-api.com`;
  return { id, token, base };
}

/** Convert Israeli phone (e.g. 0501234567, +972501234567) to chatId 972501234567@c.us */
export function toChatId(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!p.startsWith("972") && p.length === 9) p = "972" + p;
  return `${p}@c.us`;
}

async function callOnce(method: string, body: unknown, timeoutMs: number) {
  const { id, token, base } = creds();
  const url = `${base}/waInstance${id}/${method}/${token}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`Green API ${method} ${res.status}: ${text.slice(0, 300)}`) as Error & {
        status?: number;
      };
      err.status = res.status;
      throw err;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(t);
  }
}

async function call(method: string, body: unknown, timeoutMs = 8000) {
  try {
    return await callOnce(method, body, timeoutMs);
  } catch (err) {
    const status = (err as { status?: number; name?: string }).status;
    const name = (err as { name?: string }).name;
    const retryable = !status || status >= 500 || name === "AbortError";
    if (!retryable) throw err;
    console.warn(`[green-api] ${method} retry after error:`, (err as Error).message);
    await new Promise((r) => setTimeout(r, 400));
    return await callOnce(method, body, timeoutMs);
  }
}

export async function greenSendText(phone: string, message: string) {
  return call("sendMessage", { chatId: toChatId(phone), message });
}

/**
 * Send a text message to a WhatsApp group.
 * groupId can be given as raw id (e.g. "120363...") or full chatId
 * ("120363...@g.us"). We normalize to the @g.us form here.
 */
export async function greenSendGroupText(groupId: string, message: string) {
  const raw = String(groupId || "").trim();
  if (!raw) throw new Error("greenSendGroupText: empty groupId");
  const chatId = raw.includes("@g.us") ? raw : `${raw.replace(/[^\d-]/g, "")}@g.us`;
  return call("sendMessage", { chatId, message });
}

const deadEndpoints = new Set<string>();

export async function greenSendButtons(
  phone: string,
  message: string,
  buttons: ButtonRow[],
  footer?: string,
) {
  const btn3 = buttons.slice(0, 3);
  const chatId = toChatId(phone);

  if (!deadEndpoints.has("sendInteractiveButtonsReply")) {
    try {
      const body: Record<string, unknown> = {
        chatId,
        header: footer || "GOI",
        body: message,
        footer: footer || "GOI",
        buttons: btn3.map((b) => ({
          buttonId: b.buttonId,
          buttonText: b.buttonText.slice(0, 25),
        })),
      };
      return await call("sendInteractiveButtonsReply", body);
    } catch (err) {
      console.warn("[green-api] sendInteractiveButtonsReply failed, disabling for session:", err);
      deadEndpoints.add("sendInteractiveButtonsReply");
    }
  }

  if (!deadEndpoints.has("sendButtons")) {
    try {
      return await call("sendButtons", {
        chatId,
        message,
        footer: footer || "",
        buttons: btn3.map((b) => ({
          buttonId: b.buttonId,
          buttonText: b.buttonText.slice(0, 25),
        })),
      });
    } catch (err) {
      console.warn("[green-api] sendButtons failed, disabling for session:", err);
      deadEndpoints.add("sendButtons");
    }
  }

  const numbered = btn3.map((b, i) => `${i + 1}. ${b.buttonText}`).join("\n");
  const tail = footer ? `\n\n${footer}` : "";
  return greenSendText(
    phone,
    `${message}${tail}\n\n${numbered}\n\n(השב במספר ${btn3.map((_, i) => i + 1).join("/")})`,
  );
}
