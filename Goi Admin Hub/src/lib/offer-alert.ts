// Sound + vibration + browser notification for new courier offers.
// Pure client-side; works while the tab/PWA is open (incl. backgrounded).
// True background delivery when the app is fully closed requires Web Push
// (VAPID + serviceWorker.pushManager.subscribe) — separate setup.

const LS_SOUND = "goi.courier.alertSound";
const LS_VIBRATE = "goi.courier.alertVibrate";

export function isAlertSoundEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LS_SOUND) !== "0";
}
export function setAlertSoundEnabled(v: boolean) {
  try { localStorage.setItem(LS_SOUND, v ? "1" : "0"); } catch {}
}
export function isAlertVibrateEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(LS_VIBRATE) !== "0";
}
export function setAlertVibrateEnabled(v: boolean) {
  try { localStorage.setItem(LS_VIBRATE, v ? "1" : "0"); } catch {}
}

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/** Unlock audio after first user gesture (iOS/Safari requirement). */
export function primeAudioOnGesture() {
  if (typeof window === "undefined") return;
  const once = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("touchstart", once);
    window.removeEventListener("click", once);
  };
  window.addEventListener("touchstart", once, { passive: true, once: true });
  window.addEventListener("click", once, { once: true });
}

/** Two-tone beep, ~600ms. */
export function playBeep() {
  if (!isAlertSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const tones: Array<[number, number, number]> = [
      [880, now, 0.18],
      [1320, now + 0.22, 0.22],
    ];
    for (const [freq, start, dur] of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }
  } catch {}
}

export function vibrate(pattern: number | number[] = [180, 80, 180]) {
  if (!isAlertVibrateEnabled()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch {}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

export function showSystemNotification(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return; // skip when tab is foregrounded
  try {
    new Notification(title, {
      body,
      tag: tag ?? "goi-offer",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
  } catch {}
}

/** Fire the full alert: sound + vibration + system notification (if backgrounded). */
export function fireOfferAlert(title: string, body: string, tag?: string) {
  playBeep();
  vibrate();
  showSystemNotification(title, body, tag);
}
