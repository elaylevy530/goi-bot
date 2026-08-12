import { useRef, useState } from "react";
import { ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
};

/** RTL swipe-to-confirm: drag the handle from the right toward the left. */
export function SwipeConfirm({ label, onConfirm, disabled, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const maxTravel = useRef(220);

  const endDrag = (clientX: number) => {
    setDragging(false);
    const travel = Math.max(0, startX.current - clientX);
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
        "relative h-[60px] w-full rounded-[14px] bg-primary-soft overflow-hidden select-none touch-none",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onPointerDown={(e) => {
        if (disabled) return;
        const rect = trackRef.current?.getBoundingClientRect();
        maxTravel.current = Math.max(160, (rect?.width ?? 280) - 60);
        startX.current = e.clientX;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const travel = Math.max(0, Math.min(maxTravel.current, startX.current - e.clientX));
        setOffset(travel);
      }}
      onPointerUp={(e) => endDrag(e.clientX)}
      onPointerCancel={() => {
        setDragging(false);
        setOffset(0);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[15px] font-bold text-primary">{label}</span>
      </div>
      <div
        className="absolute top-1 right-1 size-[52px] rounded-full bg-primary text-primary-foreground grid place-items-center shadow-fab transition-[transform] duration-150"
        style={{ transform: `translateX(${-offset}px)` }}
      >
        <ChevronsLeft className="size-5" strokeWidth={2.5} />
      </div>
    </div>
  );
}
