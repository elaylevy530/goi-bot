/**
 * Guest (no-registration) customer session.
 *
 * Private customers can order without signing up. We keep their identity
 * (name + phone) and the orders they created in localStorage, together with
 * the per-job tracking token that authorizes reading/cancelling that job on
 * the server. Nothing sensitive lives here — the token is the capability.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchNestSession } from "@/lib/nest-auth";

const IDENTITY_KEY = "goi.guest.identity";
const ORDERS_KEY = "goi.guest.orders";
const EVENT = "goi-guest-session";

export type GuestIdentity = { full_name: string; phone: string };
export type GuestOrderRef = {
  job_id: string;
  tracking_token: string;
  job_number: string;
  created_at: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage full / disabled — guest flow still works for this session */
  }
}

export function getGuestIdentity(): GuestIdentity | null {
  const v = read<GuestIdentity | null>(IDENTITY_KEY, null);
  if (!v || !v.phone) return null;
  return v;
}

export function setGuestIdentity(identity: GuestIdentity) {
  write(IDENTITY_KEY, identity);
}

export function getGuestOrders(): GuestOrderRef[] {
  return read<GuestOrderRef[]>(ORDERS_KEY, []).filter((o) => o?.job_id && o?.tracking_token);
}

export function addGuestOrder(ref: GuestOrderRef) {
  const list = getGuestOrders().filter((o) => o.job_id !== ref.job_id);
  write(ORDERS_KEY, [ref, ...list].slice(0, 50));
}

export function clearGuestSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IDENTITY_KEY);
  window.localStorage.removeItem(ORDERS_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function guestTokenFor(jobId: string): string | null {
  return getGuestOrders().find((o) => o.job_id === jobId)?.tracking_token ?? null;
}

/**
 * Tells the customer panel whether it renders for a registered customer or a
 * guest. `loading` is true until the auth check resolves so screens don't
 * flash the wrong variant.
 */
export function useGuestSession() {
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [identity, setIdentityState] = useState<GuestIdentity | null>(null);
  const [orders, setOrders] = useState<GuestOrderRef[]>([]);

  const sync = useCallback(() => {
    setIdentityState(getGuestIdentity());
    setOrders(getGuestOrders());
  }, []);

  useEffect(() => {
    let cancelled = false;
    sync();
    (async () => {
      const session = await fetchNestSession();
      if (cancelled) return;
      const registered = !!session?.roles.includes("customer");
      setIsGuest(!registered);
      if (registered && session) {
        setIdentityState({
          full_name: session.profile?.name ?? "לקוח",
          phone:
            session.profile?.phone ??
            session.email?.split("@")[0] ??
            "",
        });
      }
      setLoading(false);
    })();

    const onChange = () => sync();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [sync]);

  return {
    loading,
    isGuest,
    identity,
    orders,
    refresh: sync,
    setIdentity: (i: GuestIdentity) => {
      setGuestIdentity(i);
      sync();
    },
  };
}
