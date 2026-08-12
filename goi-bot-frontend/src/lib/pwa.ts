/* PWA install + service-worker helpers (guarded for Lovable preview). */
import { useEffect, useState, useCallback, useRef } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Window {
    __goiDeferredInstall?: BeforeInstallPromptEvent | null;
  }
}

const DISMISS_KEY = "goi:pwa:banner-dismissed";

function inLovablePreview(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const h = window.location.hostname;
    const inIframe = window.self !== window.top;
    return (
      inIframe ||
      h.startsWith("id-preview--") ||
      h.startsWith("preview--") ||
      h.endsWith(".lovableproject.com") ||
      h === "lovableproject.com" ||
      h.endsWith(".lovableproject-dev.com") ||
      h === "lovableproject-dev.com" ||
      h.endsWith(".beta.lovable.dev") ||
      h === "beta.lovable.dev"
    );
  } catch {
    return true;
  }
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiPad = /iPad/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  return /iPhone|iPod/.test(ua) || isiPad;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function dismissInstallBanner() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

async function clearAppShellCaches() {
  if (!("caches" in window)) return;
  const cacheNames = await caches.keys();
  await Promise.allSettled(
    cacheNames
      .filter((name) => name.startsWith("goi-sw-") || name.includes("precache") || name.includes("runtime"))
      .map((name) => caches.delete(name)),
  );
}

async function unregisterAppShellWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations?.();
  await Promise.allSettled(
    (regs ?? []).map((registration) => {
      const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
      return scriptUrl.includes("/sw.js") ? registration.unregister() : Promise.resolve(false);
    }),
  );
}

/** Keep installability, but do not register app-shell caching. */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const cleanup = () => {
    Promise.allSettled([unregisterAppShellWorkers(), clearAppShellCaches()]).catch(() => undefined);
  };

  if (document.readyState === "complete") cleanup();
  else window.addEventListener("load", cleanup, { once: true });
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== "undefined" ? window.__goiDeferredInstall ?? null : null,
  );
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBefore = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      window.__goiDeferredInstall = e;
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      window.__goiDeferredInstall = null;
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    window.__goiDeferredInstall = null;
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const installable = !!deferred && !installed;
  return { installable, installed, install, isIOS: isIOS(), isStandalone: installed };
}

export function useServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const reg = (e as CustomEvent<{ reg: ServiceWorkerRegistration }>).detail?.reg ?? null;
      setWaiting(reg);
    };
    window.addEventListener("goi:sw:update-available", onUpdate as EventListener);
    return () => window.removeEventListener("goi:sw:update-available", onUpdate as EventListener);
  }, []);
  const applyUpdate = useCallback(() => {
    const w = waiting?.waiting;
    if (w) w.postMessage("SKIP_WAITING");
  }, [waiting]);
  return { updateAvailable: !!waiting, applyUpdate };
}

const BUILD_ID_KEY = "goi:app-build-id";
const DISMISS_UPDATE_KEY = "goi:update-dismissed";

type VersionPayload = { buildId?: string };

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    const id = String(data.buildId ?? "").trim();
    return id || null;
  } catch {
    return null;
  }
}

/** Detects a new deployed build (PWA / mobile) without relying on a caching service worker. */
export function useAppVersionUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const remoteIdRef = useRef<string | null>(null);

  const check = useCallback(async () => {
    if (typeof window === "undefined") return;
    const remote = await fetchRemoteBuildId();
    if (!remote) return;
    remoteIdRef.current = remote;

    const local = String(import.meta.env.VITE_APP_BUILD_ID ?? "").trim();
    let stored = "";
    try {
      stored = localStorage.getItem(BUILD_ID_KEY) ?? "";
    } catch {
      stored = "";
    }

    if (local && local === remote) {
      try {
        localStorage.setItem(BUILD_ID_KEY, remote);
      } catch {
        /* ignore */
      }
      setUpdateAvailable(false);
      return;
    }

    if (!stored) {
      try {
        localStorage.setItem(BUILD_ID_KEY, local || remote);
      } catch {
        /* ignore */
      }
      return;
    }

    if (stored !== remote) {
      try {
        if (sessionStorage.getItem(DISMISS_UPDATE_KEY) === remote) return;
      } catch {
        /* ignore */
      }
      setUpdateAvailable(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [check]);

  const applyUpdate = useCallback(async () => {
    const remote = remoteIdRef.current;
    if (remote) {
      try {
        localStorage.setItem(BUILD_ID_KEY, remote);
      } catch {
        /* ignore */
      }
    }
    await clearAppShellCaches();
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    const remote = remoteIdRef.current;
    if (remote) {
      try {
        sessionStorage.setItem(DISMISS_UPDATE_KEY, remote);
      } catch {
        /* ignore */
      }
    }
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, applyUpdate, dismissUpdate };
}
