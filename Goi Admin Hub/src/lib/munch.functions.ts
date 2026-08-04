import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

function serverClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Public: list active kiosks (all users, incl. guests) */
export const listKiosksFn = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverClient();
  const { data, error } = await sb
    .from("kiosks")
    .select("id,name,address,city,lat,lng,image_url,rating,rating_count,is_open,hours,delivery_fee_default,service_fee_default")
    .eq("is_active", true)
    .order("rating", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Kiosk[];
});

/** Public: list categories + products for a kiosk */
export const getKioskMenuFn = createServerFn({ method: "GET" })
  .inputValidator((d: { kiosk_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = serverClient();
    const [kioskRes, catsRes, prodsRes] = await Promise.all([
      sb.from("kiosks").select("*").eq("id", data.kiosk_id).maybeSingle(),
      sb.from("kiosk_categories").select("id,name,icon,sort_order").order("sort_order"),
      sb.from("kiosk_products").select("id,kiosk_id,category_id,name,description,price,unit,image_url,sort_order")
        .eq("kiosk_id", data.kiosk_id).eq("is_available", true).order("sort_order"),
    ]);
    if (kioskRes.error) throw new Error(kioskRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);
    if (prodsRes.error) throw new Error(prodsRes.error.message);
    return {
      kiosk: kioskRes.data as Kiosk | null,
      categories: (catsRes.data ?? []) as KioskCategory[],
      products: (prodsRes.data ?? []) as KioskProduct[],
    };
  });

/** Signed-in: place a munch order */
export const createMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    kiosk_id: string;
    items: MunchCartItem[];
    dropoff_address: string;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.items?.length) throw new Error("הסל ריק");

    const kioskRes = await supabase.from("kiosks").select("*").eq("id", data.kiosk_id).maybeSingle();
    if (kioskRes.error || !kioskRes.data) throw new Error("קיוסק לא נמצא");
    const kiosk = kioskRes.data as Kiosk;

    const subtotal = data.items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
    const delivery_fee = Number(kiosk.delivery_fee_default ?? 15);
    const service_fee = Number(kiosk.service_fee_default ?? 3);
    const total = subtotal + delivery_fee + service_fee;

    const { data: inserted, error } = await supabase
      .from("munch_orders")
      .insert({
        user_id: userId,
        kiosk_id: data.kiosk_id,
        items: data.items,
        subtotal,
        delivery_fee,
        service_fee,
        total,
        dropoff_address: data.dropoff_address,
        dropoff_lat: data.dropoff_lat ?? null,
        dropoff_lng: data.dropoff_lng ?? null,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select("id,total,status,kiosk_id")
      .single();
    if (error) throw new Error(error.message);
    return inserted as { id: string; total: number; status: string; kiosk_id: string };
  });

/** Signed-in: get my order by id (with linked courier job for tracking) */
export const getMunchOrderFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("munch_orders")
      .select("*, kiosk:kiosks(name,address,image_url,lat,lng)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    let job: any = null;
    if ((order as any).job_id) {
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("id,status,courier_step,selected_courier_id,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng")
        .eq("id", (order as any).job_id)
        .maybeSingle();
      job = jobRow;
    }
    return { ...(order as any), job };
  });

/** Signed-in: cancel my own munch order while it's still pending */
export const cancelMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("munch_cancel_own", { _order_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin / kiosk system: confirm order (moves to preparing) */
export const confirmMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("munch_confirm", { _order_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin / kiosk system: reject order */
export const rejectMunchOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("munch_reject", {
      _order_id: data.id,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin / kiosk system: mark ready — auto-creates a courier job */
export const markMunchReadyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("munch_mark_ready", { _order_id: data.id });
    if (error) throw new Error(error.message);
    return r as { ok: boolean; job_id: string };
  });
