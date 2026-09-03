import { useSyncExternalStore } from "react";

export type CourierTheme = "light" | "dark";

const STORAGE_KEY = "goi.courier.theme";
const EVENT = "goi-courier-theme";

export function readCourierTheme(): CourierTheme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeCourierTheme(theme: CourierTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Apply/remove `.dark` on <html> for courier CSS tokens. */
export function applyCourierThemeClass(theme: CourierTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
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
  const setTheme = (next: CourierTheme) => {
    writeCourierTheme(next);
    applyCourierThemeClass(next);
  };
  return {
    theme,
    dark: theme === "dark",
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
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
