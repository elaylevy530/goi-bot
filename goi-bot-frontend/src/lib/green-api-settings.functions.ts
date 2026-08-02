import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";

const TOGGLE_KEYS = [
  "incomingWebhook",
  "outgoingWebhook",
  "outgoingMessageWebhook",
  "outgoingAPIMessageWebhook",
  "stateWebhook",
  "deviceWebhook",
  "statusInstanceWebhook",
  "pollMessageWebhook",
  "incomingBlockWebhook",
  "incomingCallWebhook",
  "editedMessageWebhook",
  "deletedMessageWebhook",
] as const;

export type GreenApiToggleKey = typeof TOGGLE_KEYS[number];

function getCreds() {
  const id = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!id || !token) throw new Error("Green API credentials are not configured");
  return { id, token };
}

export const getGreenApiSettings = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    const { id, token } = getCreds();
    const url = `https://api.green-api.com/waInstance${id}/getSettings/${token}`;
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Green API getSettings failed: ${r.status} ${t}`);
    }
    return await r.json();
  });

export const setGreenApiSettings = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data) =>
    z
      .object({
        webhookUrl: z.string().url().optional(),
        webhookUrlToken: z.string().optional().nullable(),
        toggles: z.record(z.string(), z.enum(["yes", "no"])).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    const { id, token } = getCreds();
    const payload: Record<string, string> = {};
    if (typeof data.webhookUrl === "string") payload.webhookUrl = data.webhookUrl;
    if (typeof data.webhookUrlToken === "string") payload.webhookUrlToken = data.webhookUrlToken;
    if (data.toggles) {
      for (const [k, v] of Object.entries(data.toggles)) {
        if ((TOGGLE_KEYS as readonly string[]).includes(k)) payload[k] = v;
      }
    }
    const url = `https://api.green-api.com/waInstance${id}/setSettings/${token}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`Green API setSettings failed: ${r.status} ${text}`);
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { ok: true, response: parsed, sent: payload };
  });

export const GREEN_API_TOGGLE_KEYS = TOGGLE_KEYS;

export const getGreenApiState = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    const { id, token } = getCreds();
    const base = `https://${id.substring(0, 4)}.api.green-api.com/waInstance${id}`;
    const [stateR, settingsR, queueR] = await Promise.all([
      fetch(`${base}/getStateInstance/${token}`),
      fetch(`${base}/getSettings/${token}`),
      fetch(`${base}/showMessagesQueue/${token}`),
    ]);
    const state = await stateR.json().catch(() => null);
    const settings = await settingsR.json().catch(() => null);
    const queue = await queueR.json().catch(() => []);
    return {
      stateInstance: state?.stateInstance ?? null,
      wid: settings?.wid ?? null,
      webhookUrl: settings?.webhookUrl ?? null,
      incomingWebhook: settings?.incomingWebhook ?? null,
      outgoingMessageWebhook: settings?.outgoingMessageWebhook ?? null,
      queueSize: Array.isArray(queue) ? queue.length : 0,
    };
  });

export const clearGreenApiQueue = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    assertNestAdmin(context);
    const { id, token } = getCreds();
    const base = `https://${id.substring(0, 4)}.api.green-api.com/waInstance${id}`;
    const r = await fetch(`${base}/clearMessagesQueue/${token}`, { method: "POST" });
    const text = await r.text();
    if (!r.ok) throw new Error(`clearMessagesQueue ${r.status}: ${text}`);
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { ok: true, response: parsed };
  });
