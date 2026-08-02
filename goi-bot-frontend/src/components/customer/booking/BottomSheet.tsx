import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { ArrowRight } from "lucide-react";

type Props = PropsWithChildren<{
  /** Sheet height as viewport percentage. Auto-managed if not provided. */
  heightVh?: number;
  onBack?: () => void;
  title?: string;
  hint?: string;
  /** Progress fraction 0..1 for the top progress bar. */
  progress?: number;
}>;

/** Premium bottom sheet with drag handle. The sheet occupies the bottom of a
 *  MapBookingLayout — the map lives above it. Users can drag the handle to
 *  slightly resize the sheet (peek/half/full). */
export function BottomSheet({ children, heightVh, onBack, title, hint, progress }: Props) {
  const [h, setH] = useState<number>(heightVh ?? 62);
  const dragging = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    if (heightVh != null) setH(heightVh);
  }, [heightVh]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { startY: e.clientY, startH: h };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - dragging.current.startY;
    const vh = window.innerHeight || 800;
    const next = Math.max(28, Math.min(92, dragging.current.startH - (dy / vh) * 100));
    setH(next);
  };
  const onPointerUp = () => { dragging.current = null; };

  return (
    <div
      className="relative z-10 flex flex-col flex-shrink-0 bg-white rounded-t-3xl shadow-[0_-12px_32px_-8px_rgba(15,23,42,0.18)] overflow-hidden transition-[height] duration-200 will-change-[height]"
      style={{ height: `${h}vh`, maxHeight: "calc(100% - 120px)", minHeight: "220px" }}
    >
      {/* Drag handle */}
      <div
        className="w-full flex justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="w-11 h-1.5 bg-slate-300 rounded-full" />
      </div>

      {/* Header */}
      {(title || onBack) && (
        <div className="flex-shrink-0 px-4 pt-1 pb-3 flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="size-9 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
              aria-label="חזור"
            >
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="size-9" aria-hidden />
          )}
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-[17px] font-black text-slate-900 leading-tight truncate">{title}</h1>}
            {hint && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>}
          </div>
        </div>
      )}

      {progress != null && (
        <div className="mx-4 mb-2 h-1 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-slate-900 rounded-full transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}

      {children}
    </div>
  );
}
