import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

export type Kiosk = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  rating: number | null;
  rating_count: number | null;
  is_open: boolean;
  hours: string | null;
  delivery_fee_default: number;
  service_fee_default: number;
};

export type KioskCategory = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type KioskProduct = {
  id: string;
  kiosk_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  image_url: string | null;
  sort_order: number;
};

export type MunchCartItem = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
};

/** Public: list active kiosks (all users, incl. guests) */
export const listKiosksFn = createServerFn({ method: "GET" }).handler(async () => {
  return nestServerFetch<Kiosk[]>("/api/munch/kiosks");
});

/** Public: list categories + products for a kiosk */
export const getKioskMenuFn = createServerFn({ method: "GET" })
  .inputValidator((d: { kiosk_id: string }) => d)
  .handler(async ({ data }) => {
    return nestServerFetch<{
      kiosk: Kiosk | null;
      categories: KioskCategory[];
      products: KioskProduct[];
    }>(`/api/munch/kiosks/${data.kiosk_id}/menu`);
  });

/** Signed-in: place a munch order */
export const createMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: {
    kiosk_id: string;
    items: MunchCartItem[];
    dropoff_address: string;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    return nestServerFetch<{ id: string; total: number; status: string; kiosk_id: string }>(
      "/api/munch/orders",
      { method: "POST", accessToken: context.accessToken, body: data },
    );
  });

/** Signed-in: get my order by id (with linked courier job for tracking) */
export const getMunchOrderFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    return nestServerFetch(`/api/munch/orders/${data.id}`, {
      accessToken: context.accessToken,
    });
  });

/** Signed-in: cancel my own munch order while it's still pending */
export const cancelMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await nestServerFetch(`/api/munch/orders/${data.id}/cancel`, {
      method: "POST",
      accessToken: context.accessToken,
    });
    return { ok: true };
  });

/** Admin / kiosk system: confirm order (moves to preparing) */
export const confirmMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await nestServerFetch(`/api/munch/orders/${data.id}/confirm`, {
      method: "POST",
      accessToken: context.accessToken,
    });
    return { ok: true };
  });

/** Admin / kiosk system: reject order */
export const rejectMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string; reason?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await nestServerFetch(`/api/munch/orders/${data.id}/reject`, {
      method: "POST",
      accessToken: context.accessToken,
      body: { reason: data.reason ?? null },
    });
    return { ok: true };
  });

/** Admin / kiosk system: mark ready — auto-creates a courier job */
export const markMunchReadyFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    return nestServerFetch<{ ok: boolean; job_id: string }>(
      `/api/munch/orders/${data.id}/mark-ready`,
      { method: "POST", accessToken: context.accessToken },
    );
  });
