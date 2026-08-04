// Server-side Web Push sender using raw VAPID + Web Crypto.
// Supports BOTH:
//   - sendDatalessPush  (no body, SW shows generic notification)
//   - sendPush          (aes128gcm encrypted JSON payload per RFC 8291)
// Works on Cloudflare Workers (no `web-push` npm dep).

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function importVapidPrivateKey(privateKeyB64Url: string, publicKeyB64Url: string) {
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

async function buildVapidJwt(audience: string, subject: string, privateKeyB64Url: string, publicKeyB64Url: string): Promise<string> {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 11, // 11h
        sub: subject,
      }),
    ),
  );
  const unsigned = `${header}.${payload}`;
  const key = await importVapidPrivateKey(privateKeyB64Url, publicKeyB64Url);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64urlEncode(sig)}`;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };
export type SendResult = { endpoint: string; ok: boolean; status: number; gone?: boolean };

function vapidEnv() {
  const pub = process.env.VAPID_PUBLIC_KEY!;
  const priv = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@goi-bot.lovable.app";
  if (!pub || !priv) throw new Error("VAPID keys missing");
  return { pub, priv, subject };
}

async function vapidAuthHeader(endpoint: string): Promise<string> {
  const { pub, priv, subject } = vapidEnv();
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience, subject, priv, pub);
  return `vapid t=${jwt}, k=${pub}`;
}

/** Dataless push — recipient SW shows a generic notification. */
export async function sendDatalessPush(sub: PushSub): Promise<SendResult> {
  const auth = await vapidAuthHeader(sub.endpoint);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: { Authorization: auth, TTL: "60", Urgency: "high", "Content-Length": "0" },
  });
  return { endpoint: sub.endpoint, ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

export async function sendDatalessPushBatch(subs: PushSub[]): Promise<SendResult[]> {
  const results = await Promise.allSettled(subs.map((s) => sendDatalessPush(s)));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { endpoint: subs[i].endpoint, ok: false, status: 0 },
  );
}

// --------- aes128gcm encrypted payload (RFC 8291) ---------

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function ecdhDeriveBits(privateKey: CryptoKey, publicKey: CryptoKey, bits: number): Promise<Uint8Array> {
  const b = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, bits);
  return new Uint8Array(b);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Encrypt a payload for the given subscription (aes128gcm, single record). */
async function encryptAes128Gcm(sub: PushSub, plaintext: Uint8Array): Promise<Uint8Array> {
  const uaPublicRaw = b64urlDecode(sub.p256dh); // 65 bytes uncompressed
  const authSecret = b64urlDecode(sub.auth);    // 16 bytes

  // Ephemeral app-server keypair
  const asKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));

  // Recipient public key
  const uaPublic = await crypto.subtle.importKey(
    "raw",
    uaPublicRaw as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );

  // ECDH shared secret
  const shared = await ecdhDeriveBits(asKeys.privateKey, uaPublic, 256);

  // key_info = "WebPush: info\0" || ua_public || as_public
  const keyInfo = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    uaPublicRaw,
    asPublicRaw,
  );
  // IKM = HKDF(salt=auth_secret, ikm=shared, info=key_info, 32)
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  // Random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK + NONCE derived from IKM+salt
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // Padded plaintext: payload || 0x02 (last-record delimiter)
  const padded = concatBytes(plaintext, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, cekKey, padded as BufferSource),
  );

  // Record size big enough to contain the whole record
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + asPublicRaw.length);
  header.set(salt, 0);
  // rs as big-endian uint32
  header[16] = (rs >>> 24) & 0xff;
  header[17] = (rs >>> 16) & 0xff;
  header[18] = (rs >>> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = asPublicRaw.length; // idlen = 65
  header.set(asPublicRaw, 21);

  return concatBytes(header, ct);
}

/** Encrypted push with a JSON payload (title/body/url/tag are read by push-sw.js). */
export async function sendPush(
  sub: PushSub,
  payload: { title?: string; body?: string; url?: string; tag?: string },
): Promise<SendResult> {
  const auth = await vapidAuthHeader(sub.endpoint);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const body = await encryptAes128Gcm(sub, plaintext);

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

export async function sendPushBatch(
  subs: PushSub[],
  payload: { title?: string; body?: string; url?: string; tag?: string },
): Promise<SendResult[]> {
  const results = await Promise.allSettled(subs.map((s) => sendPush(s, payload)));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { endpoint: subs[i].endpoint, ok: false, status: 0 },
  );
}
