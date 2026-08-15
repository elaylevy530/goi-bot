import { toast } from "sonner";

const WAZE_UL = "https://waze.com/ul";

export function wazeNavigateUrl(query: string) {
  return `${WAZE_UL}?q=${encodeURIComponent(query)}&navigate=yes`;
}

export function wazeNavigateLlUrl(lat: number, lng: number) {
  return `${WAZE_UL}?ll=${lat},${lng}&navigate=yes`;
}

export function openWaze(address?: string | null) {
  const q = address?.trim();
  if (!q) {
    toast.error("אין כתובת");
    return;
  }
  window.open(wazeNavigateUrl(q), "_blank");
}
