import { useSyncExternalStore } from "react";

export type CourierTheme = "light" | "dark";

const STORAGE_KEY = "goi.courier.theme";
const EVENT = "goi-courier-theme";

export function readCourierTheme(): CourierTheme {
  return "light";
}

export function writeCourierTheme(_theme: CourierTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Apply/remove `.dark` on <html> for courier CSS tokens. Dark mode is currently off. */
export function applyCourierThemeClass(_theme?: CourierTheme) {
  clearCourierThemeClass();
}

export function clearCourierThemeClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "light";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCourierTheme() {
  const theme = useSyncExternalStore(subscribe, readCourierTheme, () => "light" as CourierTheme);
  const setTheme = (_next: CourierTheme) => {
    writeCourierTheme("light");
    applyCourierThemeClass("light");
  };
  return {
    theme,
    dark: false,
    setTheme,
    toggle: () => setTheme("light"),
  };
}

/** Minimal light map (existing courier look). */
export const COURIER_MAP_STYLES_LIGHT = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
] as const;

/** Dark / night map for courier dark mode. */
export const COURIER_MAP_STYLES_DARK = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f1f1f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1620" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#202020" }] },
] as const;
