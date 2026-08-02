import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

async function geocodeOne(address: string, lovableKey: string, mapsKey: string) {
  try {
    const res = await fetch(
      `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=il&language=iw`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey } },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat as number, lng: loc.lng as number };
  } catch {
    return null;
  }
}

export const geocodeAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: { items: { id: string; address: string }[] }) => input)
  .handler(async ({ data }): Promise<{ id: string; lat: number | null; lng: number | null }[]> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) return data.items.map((i) => ({ id: i.id, lat: null, lng: null }));
    const out = await Promise.all(
      data.items.slice(0, 25).map(async (i) => {
        if (!i.address?.trim()) return { id: i.id, lat: null, lng: null };
        const r = await geocodeOne(i.address, lovableKey, mapsKey);
        return { id: i.id, lat: r?.lat ?? null, lng: r?.lng ?? null };
      }),
    );
    return out;
  });
