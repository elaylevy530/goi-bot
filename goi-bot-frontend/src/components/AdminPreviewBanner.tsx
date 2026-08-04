import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchNestSession,
  getCachedNestPreview,
  nestExitPreview,
  type NestAuthPreview,
  type PreviewPanel,
} from "@/lib/nest-auth";
import { NEST_PREVIEW_EVENT } from "@/lib/nest-preview-cache";

const PANEL_LABEL: Record<PreviewPanel, string> = {
  courier: "פאנל שליח / מוביל",
  business: "פאנל עסק",
  customer: "פאנל לקוח פרטי",
};

/**
 * Sticky banner shown while an admin/manager JWT carries a read-only preview claim.
 * Mounted once at the app root.
 */
export function AdminPreviewBanner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<NestAuthPreview | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const cached = getCachedNestPreview();
      if (cached) {
        if (!cancelled) setPreview(cached);
        return;
      }
      const session = await fetchNestSession();
      if (!cancelled) setPreview(session?.preview ?? null);
    };
    const onFocus = () => void sync();
    const onChange = () => setPreview(getCachedNestPreview());
    void sync();
    window.addEventListener("focus", onFocus);
    window.addEventListener(NEST_PREVIEW_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NEST_PREVIEW_EVENT, onChange);
    };
  }, []);

  if (!preview?.readOnly) return null;

  const exit = async () => {
    setExiting(true);
    try {
      await nestExitPreview();
      qc.clear();
      setPreview(null);
      toast.success("חזרת לפאנל הניהול");
      await navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "לא ניתן לצאת מתצוגה מקדימה");
    } finally {
      setExiting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-[100] bg-amber-500 text-[#101418] shadow-md"
      role="status"
    >
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0 font-bold">
          <Eye className="size-4 shrink-0" />
          <span className="truncate">
            תצוגת מנהל — לקריאה בלבד · {PANEL_LABEL[preview.panel]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void exit()}
          disabled={exiting}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-[#101418] text-white px-3 py-1.5 text-xs font-bold hover:bg-black/90 disabled:opacity-60"
        >
          {exiting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
          חזרה לניהול
        </button>
      </div>
    </div>
  );
}
