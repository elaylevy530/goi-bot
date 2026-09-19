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
    return { appKey, secretKey, terminalName };
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
  async createHandshake(sum: number, requestParams: Record<string, string>): Promise<string> {
    const { appKey, secretKey, terminalName } = this.creds();
    const res = await fetch(`${API_BASE}/v2/handshake/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(appKey, secretKey),
      },
      body: JSON.stringify({ terminal_name: terminalName, sum, request_params: requestParams }),
    });
    const body = (await res.json().catch(() => null)) as HandshakeResponse | null;
    if (!res.ok || !body || body.error_code !== 0 || !body.thtk) {
      throw new AppError("upstream_failed", { userMessage: "לא ניתן לפתוח דף תשלום כרגע" });
    }
    return body.thtk;
  }

  /** Public, non-secret iframe URL. `sum` must equal the handshake sum. */
  buildIframeUrl(params: { thtk: string; sum: number; jobId: string }): string {
    const { terminalName } = this.creds();
    const qs = new URLSearchParams({
      sum: String(params.sum),
      currency: CURRENCY_NIS,
      tranmode: "A",
      thtk: params.thtk,
      lang: "il",
      goi_job: params.jobId,
    });
    // Personal response_hash uses the API user + TRANZILA_SECRET_KEY (Hosted Fields / iframe notify).
    const apiUser = this.config.get<string>("tranzila.apiUser");
    if (apiUser) qs.set("requested_by_user", apiUser);
    return `${IFRAME_BASE}/${encodeURIComponent(terminalName)}/iframenew.php?${qs.toString()}`;
  }
}
