import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes } from "crypto";
import { AppError } from "../common/errors/app.error";

const API_BASE = "https://api.tranzila.com";
const IFRAME_BASE = "https://directng.tranzila.com";
const CURRENCY_NIS = "1";

type HandshakeResponse = { error_code: number; message?: string; thtk?: string };

/**
 * Server-only Tranzila client (auth headers + Handshake V2).
 * Docs: https://docs.tranzila.com/docs/payments-and-billing/authentication
 * Handshake must be enabled for the iframe terminal in my.tranzila.com.
 */
@Injectable()
export class TranzilaClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>("tranzila.appKey") &&
      this.config.get<string>("tranzila.secretKey") &&
      this.config.get<string>("tranzila.terminalName")
    );
  }

  private creds() {
    const appKey = this.config.get<string>("tranzila.appKey");
    const secretKey = this.config.get<string>("tranzila.secretKey");
    const terminalName = this.config.get<string>("tranzila.terminalName");
    if (!appKey || !secretKey || !terminalName) {
      throw new AppError("config_missing", { userMessage: "סליקת כרטיס אינה זמינה כרגע" });
    }
    const tokenTerminal =
      this.config.get<string>("tranzila.tokenTerminalName") || terminalName;
    return { appKey, secretKey, terminalName, tokenTerminal };
  }

  tokenTerminalName(): string {
    return this.creds().tokenTerminal;
  }

  private authHeaders(appKey: string, secretKey: string): Record<string, string> {
    const time = String(Math.floor(Date.now() / 1000));
    const nonce = randomBytes(40).toString("hex");
    const token = createHmac("sha256", secretKey + time + nonce).update(appKey).digest("hex");
    return {
      "X-tranzila-api-app-key": appKey,
      "X-tranzila-api-request-time": time,
      "X-tranzila-api-nonce": nonce,
      "X-tranzila-api-access-token": token,
    };
  }

  /** Creates a handshake token (thtk, valid ~20 min) locked to `sum`. */
  async createHandshake(
    sum: number,
    requestParams: Record<string, string>,
    terminalName?: string,
  ): Promise<string> {
    const creds = this.creds();
    const terminal = terminalName ?? creds.terminalName;
    const res = await fetch(`${API_BASE}/v2/handshake/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(creds.appKey, creds.secretKey),
      },
      body: JSON.stringify({ terminal_name: terminal, sum, request_params: requestParams }),
    });
    const body = (await res.json().catch(() => null)) as HandshakeResponse | null;
    if (!res.ok || !body || body.error_code !== 0 || !body.thtk) {
      throw new AppError("upstream_failed", { userMessage: "לא ניתן לפתוח דף תשלום כרגע" });
    }
    return body.thtk;
  }

  /** Public, non-secret iframe URL. `sum` must equal the handshake sum. */
  buildIframeUrl(params: {
    thtk: string;
    sum: number;
    extra?: Record<string, string>;
    terminalName?: string;
    tokenize?: boolean;
    tranmode?: string;
  }): string {
    const creds = this.creds();
    const terminal = params.terminalName ?? creds.terminalName;
    const qs = new URLSearchParams({
      sum: String(params.sum),
      currency: CURRENCY_NIS,
      tranmode: params.tranmode ?? "A",
      thtk: params.thtk,
      lang: "il",
      ...(params.extra ?? {}),
    });
    if (params.tokenize) qs.set("tokenize", "1");
    const apiUser = this.config.get<string>("tranzila.apiUser");
    if (apiUser) qs.set("requested_by_user", apiUser);
    return `${IFRAME_BASE}/${encodeURIComponent(terminal)}/iframenew.php?${qs.toString()}`;
  }

  /** Charges a previously saved Tranzila card token. Never send PAN. */
  async chargeToken(params: {
    amount: number;
    token: string;
    expireMonth: number;
    expireYear: number;
  }): Promise<{ transactionId: string }> {
    const { appKey, secretKey, tokenTerminal } = this.creds();
    const res = await fetch(`${API_BASE}/v1/transaction/credit_card/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(appKey, secretKey),
      },
      body: JSON.stringify({
        terminal_name: tokenTerminal,
        txn_type: "debit",
        txn_currency_code: "ILS",
        card_number: params.token,
        expire_month: params.expireMonth,
        expire_year: params.expireYear,
        items: [
          {
            name: "Wallet recharge",
            type: "I",
            unit_price: params.amount,
            units_number: 1,
            price_type: "G",
            vat_percent: 0,
          },
        ],
      }),
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !tokenChargeSucceeded(body)) {
      throw new AppError("upstream_failed", { userMessage: "החיוב נדחה. נסו כרטיס אחר או טעינה מחדש." });
    }
    const transactionId =
      nestedString(body, "transaction_id") ||
      nestedString(body, "transaction_response", "transaction_id") ||
      nestedString(body, "ConfirmationCode") ||
      "";
    if (!transactionId) {
      throw new AppError("upstream_failed", { userMessage: "החיוב נדחה. נסו כרטיס אחר או טעינה מחדש." });
    }
    return { transactionId };
  }
}

function nestedString(body: Record<string, unknown> | null, ...path: string[]): string {
  let cur: unknown = body;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" || typeof cur === "number" ? String(cur).trim() : "";
}

function tokenChargeSucceeded(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  const codes = [
    nestedString(body, "processor_response_code"),
    nestedString(body, "Response"),
    nestedString(body, "transaction_response", "processor_response_code"),
  ];
  if (codes.some((c) => c === "000" || c === "0")) return true;
  const tr = body.transaction_response;
  return Boolean(tr && typeof tr === "object" && (tr as { success?: boolean }).success === true);
}
