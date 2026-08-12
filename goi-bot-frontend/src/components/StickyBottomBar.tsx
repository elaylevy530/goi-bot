import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyBottomBarProps = {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
};

/**
 * Fixed bottom action bar with safe-area padding and GOI elevation tokens.
 */
export function StickyBottomBar({
  children,
  className,
  elevated = true,
}: StickyBottomBarProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]",
        elevated && "shadow-bottom-bar",
        className,
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-3">{children}</div>
    </div>
  );
}
