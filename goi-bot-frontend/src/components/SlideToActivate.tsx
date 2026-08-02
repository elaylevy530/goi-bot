import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";

type Props = {
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  labelOff?: string;
  labelOn?: string;
  hintOff?: string;
  hintOn?: string;
};

/**
 * Wolt-style slide-to-activate (RTL).
 * - Inactive: dark pill, knob on the right, drag LEFT to activate.
 * - Active:   cyan pill, knob on the left, drag RIGHT to deactivate.
 */
export function SlideToActivate({
  active,
  disabled,
  loading,
  onActivate,
  onDeactivate,
  labelOff = "החלק להפעלה",
  labelOn = "פעיל — החלק לכיבוי",
  hintOff,
  hintOn,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const maxRef = useRef(0);

  const KNOB = 44;
  const PAD = 3;


  useEffect(() => {
    setDragX(0);
  }, [active]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || loading) return;
    const track = trackRef.current;
    if (!track) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    maxRef.current = track.clientWidth - KNOB - PAD * 2;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    const progress = active ? Math.max(0, delta) : Math.max(0, -delta);
    setDragX(Math.min(progress, maxRef.current));
  };

  const finish = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = maxRef.current * 0.7;
    if (dragX >= threshold) {
      if (active) onDeactivate();
      else onActivate();
    }
    setDragX(0);
  };

  const pct = maxRef.current ? Math.min(100, (dragX / maxRef.current) * 100) : 0;

  const knobStyle: React.CSSProperties = active
    ? { left: `${PAD + dragX}px` }
    : { right: `${PAD + dragX}px` };

  return (
    <div className="w-full" dir="rtl">
      <div
        ref={trackRef}
        className={`relative h-12 w-full rounded-full overflow-hidden select-none border transition-colors duration-300 ${
          active
            ? "bg-primary border-primary/40 shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
            : "bg-secondary border-border shadow-sm"
        }`}
      >
        {/* Subtle inner sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.08) 100%)",
          }}
        />

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
          <div
            className={`relative text-[13px] font-bold tracking-tight whitespace-nowrap ${
              active ? "text-primary-foreground" : "text-foreground/70"
            }`}
            style={{ opacity: Math.max(0.35, 1 - pct / 100) }}
          >
            <span className="relative inline-flex items-center gap-1.5">
              <ChevronLeft
                className={`size-3.5 ${active ? "rotate-180" : ""}`}
                aria-hidden
              />
              <span className={active ? "slide-shimmer" : ""}>
                {active ? labelOn : labelOff}
              </span>
            </span>
          </div>
        </div>

        {/* Knob */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          role="switch"
          aria-checked={active}
          aria-label={active ? "החלק לכיבוי" : "החלק להפעלה"}
          tabIndex={0}
          onKeyDown={(e) => {
            if (disabled || loading) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (active) onDeactivate();
              else onActivate();
            }
          }}
          className={`absolute top-1 grid place-items-center rounded-full cursor-grab active:cursor-grabbing bg-background shadow-[0_3px_10px_rgba(0,0,0,0.18)] ${
            active ? "text-primary" : "text-foreground/80"
          } ${dragging ? "" : "transition-[right,left] duration-300 ease-out"}`}
          style={{
            width: KNOB,
            height: KNOB,
            ...knobStyle,
          }}
        >
          {active ? (
            <Check className="size-5" strokeWidth={3} />
          ) : (
            <ChevronLeft className="size-5" strokeWidth={3} />
          )}
        </div>
      </div>


      {(hintOff || hintOn) && (
        <div className="mt-2 text-[11px] text-slate-500 text-center">
          {active ? hintOn : hintOff}
        </div>
      )}

      <style>{`
        .slide-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.55) 0%,
            rgba(255,255,255,1) 45%,
            rgba(255,255,255,1) 55%,
            rgba(255,255,255,0.55) 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: slideShimmer 1.8s linear infinite;
        }
        @keyframes slideShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
