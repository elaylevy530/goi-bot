/** Browser Maps key. Netlify may set GOOGLE_MAPS_BROWSER_KEY; Vite inlines only VITE_*. */
export function googleMapsBrowserKey(): string {
  return String(
    import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
      "",
  ).trim();
}

export function googleMapsTrackingId(): string {
  return String(import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID || "").trim();
}
