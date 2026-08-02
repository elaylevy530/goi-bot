import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type ButtonRow = { buttonId: string; buttonText: string };

/**
 * Minimal Green API client (unofficial WhatsApp provider).
 * Ported from goi-bot-frontend/src/lib/green-api.internal.server.ts — only
 * the subset needed by the notification queue drain and webhook replies.
 * Docs: https://green-api.com/en/docs/api/
 */
@Injectable()
export class GreenApiClient {
  private readonly logger = new Logger(GreenApiClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>("greenApi.instanceId") &&
      this.config.get<string>("greenApi.token")
    );
  }

  /** Convert Israeli phone (0501234567, +972501234567) to chatId 972501234567@c.us */
  toChatId(phone: string): string {
    let p = (phone || "").replace(/[^\d+]/g, "");
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("0")) p = "972" + p.slice(1);
    if (!p.startsWith("972") && p.length === 9) p = "972" + p;
    return `${p}@c.us`;
  }

  private creds() {
    const id = this.config.get<string>("greenApi.instanceId");
    const token = this.config.get<string>("greenApi.token");
    if (!id || !token) throw new Error("GREEN_API credentials missing");
    const prefix = id.substring(0, 4);
    return { id, token, base: `https://${prefix}.api.green-api.com` };
  }

  private async call(method: string, body: unknown, timeoutMs = 8000): Promise<unknown> {
    const { id, token, base } = this.creds();
    const url = `${base}/waInstance${id}/${method}/${token}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Green API ${method} ${res.status}: ${text.slice(0, 300)}`);
      }
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  async sendText(phone: string, message: string): Promise<unknown> {
    return this.call("sendMessage", { chatId: this.toChatId(phone), message });
  }

  /**
   * Send a text message to a WhatsApp group.
   * `groupId` may be a raw id ("120363...") or full chatId ("…@g.us").
   */
  async sendGroupText(groupId: string, message: string): Promise<unknown> {
    const raw = String(groupId || "").trim();
    if (!raw) throw new Error("sendGroupText: empty groupId");
    const chatId = raw.includes("@g.us")
      ? raw
      : `${raw.replace(/[^\d-]/g, "")}@g.us`;
    return this.call("sendMessage", { chatId, message });
  }

  /** Best-effort native buttons; falls back to a numbered text list on failure. */
  async sendButtons(
    phone: string,
    message: string,
    buttons: ButtonRow[],
    footer?: string,
  ): Promise<unknown> {
    const btn3 = buttons.slice(0, 3);
    const chatId = this.toChatId(phone);
    try {
      return await this.call("sendInteractiveButtonsReply", {
        chatId,
        header: footer || "GOI",
        body: message,
        footer: footer || "GOI",
        buttons: btn3.map((b) => ({
          buttonId: b.buttonId,
          buttonText: b.buttonText.slice(0, 25),
        })),
      });
    } catch (err) {
      this.logger.warn(
        `sendInteractiveButtonsReply failed, falling back to numbered text: ${(err as Error).message}`,
      );
      const numbered = btn3.map((b, i) => `${i + 1}. ${b.buttonText}`).join("\n");
      const tail = footer ? `\n\n${footer}` : "";
      return this.sendText(
        phone,
        `${message}${tail}\n\n${numbered}\n\n(השב במספר ${btn3.map((_, i) => i + 1).join("/")})`,
      );
    }
  }
}
