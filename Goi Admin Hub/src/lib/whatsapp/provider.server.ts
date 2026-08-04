/**
 * WhatsApp provider abstraction.
 *
 * Selects the active backend based on env WHATSAPP_PROVIDER:
 *   - "green" (default): Green API (unofficial, current).
 *   - "cloud": Meta WhatsApp Cloud API (official).
 *
 * All app code should import sendText / sendButtons from here once the
 * official provider is live. Existing imports of "./green-api.server" stay
 * working — that module now delegates here.
 */

import * as green from "../green-api.internal.server";
import * as cloud from "./cloud-api.server";
import { isServiceWindowOpen } from "./service-window.server";
import { isSendAllowed } from "./maintenance.server";

export type WhatsAppProvider = "green" | "cloud";

export function getActiveProvider(): WhatsAppProvider {
  const v = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();
  if (v === "cloud") return "cloud";
  return "green";
}

export function providerStatus() {
  const active = getActiveProvider();
  return {
    active,
    green: {
      configured: !!(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_TOKEN),
    },
    cloud: {
      configured: cloud.isCloudConfigured(),
      hasAppSecret: !!process.env.WHATSAPP_CLOUD_APP_SECRET,
      hasVerifyToken: !!process.env.WHATSAPP_CLOUD_VERIFY_TOKEN,
      apiVersion: process.env.WHATSAPP_CLOUD_API_VERSION || "v21.0",
      fallbackTemplate: process.env.WHATSAPP_CLOUD_REOPEN_TEMPLATE || null,
      templateLanguage: process.env.WHATSAPP_CLOUD_TEMPLATE_LANG || "he",
    },
  };
}

type ButtonRow = { buttonId: string; buttonText: string };

/**
 * Cloud-mode safety: when the 24h service window is closed, free-form text /
 * interactive sends are rejected by Meta (131047/131026). Auto-fall back to
 * an approved template if WHATSAPP_CLOUD_REOPEN_TEMPLATE is configured.
 */
async function cloudSendOrTemplate(
  phone: string,
  message: string,
  send: () => Promise<unknown>,
): Promise<unknown> {
  const open = await isServiceWindowOpen(phone).catch(() => false);
  if (open) return send();

  const tmpl = process.env.WHATSAPP_CLOUD_REOPEN_TEMPLATE;
  const lang = process.env.WHATSAPP_CLOUD_TEMPLATE_LANG || "he";
  if (!tmpl) {
    console.warn(
      "[wa.provider] service window closed and no WHATSAPP_CLOUD_REOPEN_TEMPLATE configured; attempting direct send",
    );
    return send();
  }
  const param = (message || "").slice(0, 1000);
  return cloud.cloudSendTemplate(phone, tmpl, lang, [param]);
}

/**
 * TEMPORARY: private WhatsApp DMs to couriers/businesses are disabled while
 * we wait for the official WhatsApp Cloud number. Green-API DMs get the
 * sending number blocked. GROUP broadcasts (see whatsapp/group-dispatch.server.ts)
 * are unaffected — they go through a different path.
 * Flip WHATSAPP_PRIVATE_ENABLED=1 to re-enable individual sends.
 */
function isPrivateSendDisabled(): boolean {
  if (getActiveProvider() === "cloud") return false; // official API is safe
  return process.env.WHATSAPP_PRIVATE_ENABLED !== "1";
}

export async function sendText(phone: string, message: string) {
  if (isPrivateSendDisabled()) {
    console.log(`[wa.provider] private DM disabled, skipping -> ${phone}`);
    return { skipped: true, reason: "private_dm_disabled" };
  }
  const gate = await isSendAllowed(phone);
  if (!gate.allowed) {
    console.warn(`[wa.provider] blocked by maintenance mode -> ${phone}`);
    return { skipped: true, reason: gate.reason };
  }
  if (getActiveProvider() === "cloud") {
    return cloudSendOrTemplate(phone, message, () => cloud.cloudSendText(phone, message));
  }
  return green.greenSendText(phone, message);
}

export async function sendButtons(
  phone: string,
  message: string,
  buttons: ButtonRow[],
  footer?: string,
) {
  if (isPrivateSendDisabled()) {
    console.log(`[wa.provider] private DM disabled, skipping -> ${phone}`);
    return { skipped: true, reason: "private_dm_disabled" };
  }
  const gate = await isSendAllowed(phone);
  if (!gate.allowed) {
    console.warn(`[wa.provider] blocked by maintenance mode -> ${phone}`);
    return { skipped: true, reason: gate.reason };
  }
  if (getActiveProvider() === "cloud") {
    return cloudSendOrTemplate(phone, message, () =>
      cloud.cloudSendButtons(phone, message, buttons, footer),
    );
  }
  return green.greenSendButtons(phone, message, buttons, footer);
}


export function toChatId(phone: string): string {
  // Keep Green-style chatId everywhere — Cloud webhook normalizer emits the
  // same shape, so the rest of the codebase keeps working unchanged.
  return green.toChatId(phone);
}
