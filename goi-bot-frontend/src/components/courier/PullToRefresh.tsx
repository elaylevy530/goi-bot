import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 64;
const MAX_PULL = 96;

type Props = {
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  className?: string;
  /** Skip pull when the gesture starts on these targets (e.g. a map canvas). */
  ignoreSelector?: string;
};

export function PullToRefresh({ onRefresh, children, className, ignoreSelector }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollEl = () => {
      const marked = root.querySelector("[data-ptr-scroll]") as HTMLElement | null;
      if (marked) return marked;
      let node: HTMLElement | null = root;
      while (node) {
        const overflowY = window.getComputedStyle(node).overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 1
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return root;
    };

    const atTop = () => scrollEl().scrollTop <= 1;

    const setPull = (value: number) => {
      offsetRef.current = value;
      setOffset(value);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const target = e.target as HTMLElement | null;
      if (ignoreSelector && target?.closest(ignoreSelector)) {
        pulling.current = false;
        return;
      }
      if (!atTop()) {
        pulling.current = false;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY.current;
      if (dy <= 0 || !atTop()) {
        if (offsetRef.current) setPull(0);
        pulling.current = dy > 0;
        return;
      }
      const next = Math.min(MAX_PULL, dy * 0.42);
      setPull(next);
      if (next > 10) e.preventDefault();
    };

    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      const shouldRefresh = offsetRef.current >= THRESHOLD && !refreshingRef.current;
      if (!shouldRefresh) {
        setPull(0);
        return;
      }
      setRefreshing(true);
      setPull(THRESHOLD);
      void (async () => {
        const started = Date.now();
        try {
          await onRefresh();
        } finally {
          const wait = Math.max(0, 420 - (Date.now() - started));
          window.setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, wait);
        }
      })();
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd);
    root.addEventListener("touchcancel", onEnd);
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
    };
  }, [ignoreSelector, onRefresh]);

  const armed = offset >= THRESHOLD || refreshing;

  return (
    <div ref={rootRef} className={cn("relative overscroll-y-contain", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex justify-center"
        style={{
          top: "max(0.5rem, env(safe-area-inset-top, 0px))",
          opacity: refreshing ? 1 : Math.min(1, offset / THRESHOLD),
          transform: `translateY(${Math.max(0, offset * 0.35)}px)`,
        }}
        aria-hidden
      >
        <div className="size-9 rounded-full bg-surface shadow-card grid place-items-center">
          <Loader2
            className={cn("size-5 text-primary", armed && "animate-spin")}
            strokeWidth={2.5}
          />
        </div>
      </div>
      <div
        className="h-full min-h-0 flex flex-col"
        style={{
          transform: `translateY(${offset}px)`,
          transition: pulling.current || refreshing ? "none" : "transform 180ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
