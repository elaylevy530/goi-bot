import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Loader2, X } from "lucide-react";


declare global {
  interface Window {
    __gmapsLoader?: Promise<void>;
    __initGmaps?: () => void;
  }
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

/** Loads Google Maps JS once, shared across all consumers. */
export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsLoader) return window.__gmapsLoader;
  window.__gmapsLoader = new Promise<void>((resolve, reject) => {
    if (!BROWSER_KEY) { reject(new Error("Missing Google Maps key")); return; }
    if (document.querySelector("script[src*='maps.googleapis.com/maps/api/js']")) {
      const check = () => window.google?.maps ? resolve() : setTimeout(check, 60);
      check();
      return;
    }
    window.__initGmaps = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&libraries=places&loading=async&callback=__initGmaps${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__gmapsLoader;
}

export type SelectedPlace = {
  address: string;
  lat: number;
  lng: number;
};

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  /** Present when suggestion came from Nominatim fallback (no Google Place details call). */
  lat?: number;
  lng?: number;
  source: "google" | "nominatim";
};

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (place: SelectedPlace) => void;
  accent: "green" | "red";
  autoFocus?: boolean;
  /** Inline validation message shown under the field. */
  error?: string | null;
};

/** OpenStreetMap Nominatim — used when Google Places is blocked (common on localhost referrer restrictions). */
async function fetchNominatimSuggestions(query: string): Promise<Suggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "6",
      countrycodes: "il",
      "accept-language": "he",
    });
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: { road?: string; house_number?: string; city?: string; town?: string; village?: string };
  }>;
  return (data ?? []).map((r) => {
    const city = r.address?.city || r.address?.town || r.address?.village || "";
    const road = [r.address?.road, r.address?.house_number].filter(Boolean).join(" ");
    const primary = road || r.display_name.split(",")[0] || r.display_name;
    const secondary = city
      ? `${city}, ישראל`
      : r.display_name.split(",").slice(1).join(",").trim();
    return {
      placeId: `osm:${r.place_id}`,
      primary,
      secondary,
      lat: Number(r.lat),
      lng: Number(r.lon),
      source: "nominatim" as const,
    };
  }).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

export function AddressAutocomplete({ label, placeholder, value, onChange, onSelect, accent, autoFocus, error }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleBlockedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, suggestions.length]);


  useEffect(() => {
    loadGoogleMaps().catch(() => {});
  }, []);

  // Close on outside click (ignore clicks inside the portal dropdown)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);


  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      // Skip Google after we already know this origin is referrer-blocked (e.g. localhost).
      if (!googleBlockedRef.current && BROWSER_KEY) {
        try {
          await loadGoogleMaps();
          const { AutocompleteSuggestion, AutocompleteSessionToken } =
            (await window.google.maps.importLibrary("places")) as any;
          if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
          const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current,
            language: "iw",
            region: "il",
            includedRegionCodes: ["IL"],
          });
          const mapped: Suggestion[] = (raw ?? []).slice(0, 6).map((s: any) => ({
            placeId: s.placePrediction?.placeId ?? "",
            primary: s.placePrediction?.mainText?.text ?? s.placePrediction?.text?.text ?? "",
            secondary: s.placePrediction?.secondaryText?.text ?? "",
            source: "google" as const,
          })).filter((s: Suggestion) => s.placeId && s.primary);
          if (mapped.length > 0) {
            setUsingFallback(false);
            setSuggestions(mapped);
            setOpen(true);
            return;
          }
        } catch {
          googleBlockedRef.current = true;
        }
      }

      const fallback = await fetchNominatimSuggestions(query);
      setUsingFallback(true);
      setSuggestions(fallback);
      setOpen(fallback.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  };

  const handlePick = async (s: Suggestion) => {
    setOpen(false);
    if (s.source === "nominatim" && s.lat != null && s.lng != null) {
      const address = `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      onChange(address);
      onSelect({ address, lat: s.lat, lng: s.lng });
      return;
    }
    try {
      await loadGoogleMaps();
      const { Place } = (await window.google.maps.importLibrary("places")) as any;
      const place = new Place({ id: s.placeId });
      await place.fetchFields({ fields: ["formattedAddress", "location"] });
      const address = place.formattedAddress ?? `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      const loc = place.location;
      if (!loc) return;
      onChange(address);
      onSelect({ address, lat: loc.lat(), lng: loc.lng() });
      sessionTokenRef.current = null; // end session
    } catch {
      // fallback: just set text (no coords — order still blocked until a place is selected)
      const address = `${s.primary}${s.secondary ? ", " + s.secondary : ""}`;
      onChange(address);
    }
  };

  const dotClass = accent === "green" ? "bg-[#0E7A4A] ring-[#E6F7EF]" : "bg-[#DC2626] ring-red-50";
  const hasError = Boolean(error);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 ring-1 transition ${
          hasError
            ? "ring-destructive/60 focus-within:ring-destructive"
            : "ring-black/5 focus-within:ring-black/25"
        }`}
      >
        <div className={`size-3 rounded-full ${dotClass} ring-4 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              hasError ? "text-destructive" : "text-[#101418]/50"
            }`}
          >
            {label}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-invalid={hasError}
            className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-[#101418] placeholder:text-[#101418]/40 placeholder:font-normal py-0.5"
          />
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-[#101418]/40 shrink-0" />
        ) : value ? (
          <button
            type="button"
            onClick={() => { onChange(""); setSuggestions([]); setOpen(false); }}
            className="size-6 rounded-full bg-black/5 hover:bg-black/10 grid place-items-center text-[#101418]/50 shrink-0"
            aria-label="נקה"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <MapPin className="size-4 text-[#101418]/30 shrink-0" />
        )}
      </div>
      {hasError && (
        <p className="mt-1 px-1 text-[11px] font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      {open && suggestions.length > 0 && rect && typeof document !== "undefined" && createPortal(
        <div
          ref={portalRef}
          dir="rtl"
          className="fixed z-[100] bg-white rounded-2xl shadow-xl ring-1 ring-black/10 overflow-hidden max-h-[50vh] overflow-y-auto"
          style={{ top: rect.top, left: rect.left, width: rect.width }}
        >
          {usingFallback && (
            <div className="px-4 py-2 text-[10px] font-semibold text-[#101418]/50 bg-[#f5f6f8] border-b border-black/5">
              חיפוש חלופי (Google Places חסום בכתובת הנוכחית)
            </div>
          )}

          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handlePick(s)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#f5f6f8] text-right transition border-b border-black/5 last:border-0"
            >
              <MapPin className="size-4 text-[#101418]/40 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#101418] truncate">{s.primary}</div>
                {s.secondary && <div className="text-xs text-[#101418]/50 truncate">{s.secondary}</div>}
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}

    </div>
  );
}
