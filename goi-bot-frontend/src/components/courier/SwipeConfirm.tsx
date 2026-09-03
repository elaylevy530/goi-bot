import { useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight, Power } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  subtitle?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "availability";
};

/**
 * default: RTL swipe — handle on the right, drag left.
 * availability: LTR swipe — handle on the left, drag right.
 */
export function SwipeConfirm({
  label,
  subtitle,
  onConfirm,
  disabled,
  className,
  variant = "default",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const maxTravel = useRef(220);
  const isAvailability = variant === "availability";

  const endDrag = (clientX: number) => {
    setDragging(false);
    const travel = isAvailability
      ? Math.max(0, clientX - startX.current)
      : Math.max(0, startX.current - clientX);
    const threshold = maxTravel.current * 0.65;
    if (travel >= threshold && !disabled) {
      setOffset(maxTravel.current);
      onConfirm();
      window.setTimeout(() => setOffset(0), 400);
    } else {
      setOffset(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative w-full select-none touch-none overflow-hidden",
        isAvailability
          ? "h-[64px] rounded-full border border-[#DCEFD6] bg-[#F1F9EF]"
          : "h-[60px] rounded-[14px] bg-primary-soft",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onPointerDown={(e) => {
        if (disabled) return;
        const rect = trackRef.current?.getBoundingClientRect();
        const handle = isAvailability ? 56 : 60;
        maxTravel.current = Math.max(160, (rect?.width ?? 280) - handle - 8);
        startX.current = e.clientX;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const travel = isAvailability
          ? Math.max(0, Math.min(maxTravel.current, e.clientX - startX.current))
          : Math.max(0, Math.min(maxTravel.current, startX.current - e.clientX));
        setOffset(travel);
      }}
      onPointerUp={(e) => endDrag(e.clientX)}
      onPointerCancel={() => {
        setDragging(false);
        setOffset(0);
      }}
    >
      {isAvailability ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-0 w-20 rounded-full bg-gradient-to-r from-transparent via-white/75 to-transparent blur-[1px] [animation:availability-sheen_2.2s_ease-in-out_infinite]"
        />
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center",
          isAvailability ? "px-[5.25rem]" : "px-[5.25rem]",
        )}
      >
        <span
          className={cn(
            "font-extrabold leading-tight",
            isAvailability
              ? "whitespace-nowrap text-[14px] text-[#111]"
              : "text-[15px] font-bold text-primary",
          )}
        >
          {label}
        </span>
        {subtitle ? (
          <span className="mt-0.5 text-[12px] font-medium leading-tight text-[#6B6B6B]">
            {subtitle}
          </span>
        ) : null}
      </div>

      {isAvailability ? (
        <div
          className="pointer-events-none absolute left-[62px] top-[56%] flex text-[#35AD29] drop-shadow-[0_2px_4px_rgba(53,173,41,0.2)] transition-opacity duration-100"
          style={{
            transform: "translateY(-50%)",
            opacity: offset > 16 ? 0 : 1,
          }}
          aria-hidden
        >
          <span className="inline-flex [animation:availability-arrow-cue_1.35s_ease-in-out_infinite]">
            <ChevronsRight className="size-[22px]" strokeWidth={2.8} />
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute grid place-items-center",
          isAvailability
            ? "top-1 left-1 size-[56px] rounded-full bg-[#35AD29] text-white shadow-[0_6px_16px_rgba(53,173,41,0.4)]"
            : "top-1 right-1 size-[52px] rounded-full bg-primary text-primary-foreground shadow-fab",
          dragging ? "transition-none" : "transition-transform duration-150",
        )}
        style={{
          transform: isAvailability
            ? `translateX(${offset}px)`
            : `translateX(${-offset}px)`,
        }}
      >
        {isAvailability ? (
          <Power className="size-6" strokeWidth={2.4} />
        ) : (
          <ChevronsLeft className="size-5" strokeWidth={2.5} />
        )}
      </div>
    </div>
  );
}
