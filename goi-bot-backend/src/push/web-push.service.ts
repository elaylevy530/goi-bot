import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Server-side Web Push sender using raw VAPID + Web Crypto (RFC 8291 aes128gcm).
// Ported from goi-bot-frontend/src/lib/push/send.server.ts — no `web-push` npm dep needed.

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return Buffer.from(s, "binary").toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title?: string; body?: string; url?: string; tag?: string };
export type SendResult = { endpoint: string; ok: boolean; status: number; gone?: boolean };

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(this.config.get<string>("vapid.publicKey") && this.config.get<string>("vapid.privateKey"));
  }

  private vapidEnv() {
    const pub = this.config.get<string>("vapid.publicKey");
    const priv = this.config.get<string>("vapid.privateKey");
    const subject = this.config.get<string>("vapid.subject") ?? "mailto:support@goi-bot.lovable.app";
    if (!pub || !priv) throw new Error("VAPID keys missing");
    return { pub, priv, subject };
  }

  private async importVapidPrivateKey(privateKeyB64Url: string, publicKeyB64Url: string) {
    const d = b64urlEncode(b64urlDecode(privateKeyB64Url));
    const pub = b64urlDecode(publicKeyB64Url); // uncompressed: 0x04 || X(32) || Y(32)
    if (pub.length !== 65 || pub[0] !== 0x04) throw new Error("invalid VAPID public key");
    const x = b64urlEncode(pub.slice(1, 33));
    const y = b64urlEncode(pub.slice(33, 65));
    return crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d, x, y, ext: true, key_ops: ["sign"] },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }

  private async buildVapidJwt(
    audience: string,
    subject: string,
    privateKeyB64Url: string,
    publicKeyB64Url: string,
  ): Promise<string> {
    const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
    const payload = b64urlEncode(
      new TextEncoder().encode(
        JSON.stringify({
          aud: audience,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 11,
          sub: subject,
        }),
      ),
    );
    const unsigned = `${header}.${payload}`;
    const key = await this.importVapidPrivateKey(privateKeyB64Url, publicKeyB64Url);
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned),
    );
    return `${unsigned}.${b64urlEncode(sig)}`;
  }

  private async vapidAuthHeader(endpoint: string): Promise<string> {
    const { pub, priv, subject } = this.vapidEnv();
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await this.buildVapidJwt(audience, subject, priv, pub);
    return `vapid t=${jwt}, k=${pub}`;
  }

  private concatBytes(...parts: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  }

  private async hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
      key,
      length * 8,
    );
    return new Uint8Array(bits);
  }

  /** Encrypt a payload for the given subscription (aes128gcm, single record). */
  private async encryptAes128Gcm(sub: PushSub, plaintext: Uint8Array): Promise<Uint8Array> {
    const uaPublicRaw = b64urlDecode(sub.p256dh);
    const authSecret = b64urlDecode(sub.auth);

    const asKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));

    const uaPublic = await crypto.subtle.importKey(
      "raw",
      uaPublicRaw as BufferSource,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      [],
    );

    const shared = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublic }, asKeys.privateKey, 256),
    );

    const keyInfo = this.concatBytes(new TextEncoder().encode("WebPush: info\0"), uaPublicRaw, asPublicRaw);
    const ikm = await this.hkdf(authSecret, shared, keyInfo, 32);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const cek = await this.hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await this.hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

    const padded = this.concatBytes(plaintext, new Uint8Array([0x02]));

    const cekKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, [
      "encrypt",
    ]);
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, cekKey, padded as BufferSource),
    );

    const rs = 4096;
    const header = new Uint8Array(16 + 4 + 1 + asPublicRaw.length);
    header.set(salt, 0);
    header[16] = (rs >>> 24) & 0xff;
    header[17] = (rs >>> 16) & 0xff;
    header[18] = (rs >>> 8) & 0xff;
    header[19] = rs & 0xff;
    header[20] = asPublicRaw.length;
    header.set(asPublicRaw, 21);

    return this.concatBytes(header, ct);
  }

  async sendPush(sub: PushSub, payload: PushPayload): Promise<SendResult> {
    const auth = await this.vapidAuthHeader(sub.endpoint);
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const body = await this.encryptAes128Gcm(sub, plaintext);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: auth,
        TTL: "300",
        Urgency: "high",
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(body.byteLength),
      },
      body: body as BodyInit,
    });
    return { endpoint: sub.endpoint, ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
  }

  async sendPushBatch(subs: PushSub[], payload: PushPayload): Promise<SendResult[]> {
    if (!this.isConfigured()) {
      this.logger.warn("VAPID keys missing — skipping push batch send");
      return subs.map((s) => ({ endpoint: s.endpoint, ok: false, status: 0 }));
    }
    const results = await Promise.allSettled(subs.map((s) => this.sendPush(s, payload)));
    return results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { endpoint: subs[i].endpoint, ok: false, status: 0 },
    );
  }
}
