export type CachedNestPreview = {
  panel: "courier" | "business" | "customer";
  courierId?: string;
  customerId?: string;
  readOnly: true;
  sessionId?: string;
  expiresAt?: string;
};

const NEST_PREVIEW_KEY = "goi_nest_preview";
export const NEST_PREVIEW_EVENT = "goi-nest-preview-change";

function emitPreviewChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NEST_PREVIEW_EVENT));
}

export function setNestPreviewCache(preview: CachedNestPreview | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (preview?.readOnly) {
      window.sessionStorage.setItem(NEST_PREVIEW_KEY, JSON.stringify(preview));
    } else {
      window.sessionStorage.removeItem(NEST_PREVIEW_KEY);
    }
  } catch {
    // ignore
  }
  emitPreviewChange();
}

export function clearNestPreviewCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(NEST_PREVIEW_KEY);
  } catch {
    // ignore
  }
  emitPreviewChange();
}

/** Sync read of cached preview claim (for api client write blocking). */
export function getCachedNestPreview(): CachedNestPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(NEST_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNestPreview;
    return parsed?.readOnly ? parsed : null;
  } catch {
    return null;
  }
}

export function isNestPreviewReadOnly(): boolean {
  return !!getCachedNestPreview()?.readOnly;
}
