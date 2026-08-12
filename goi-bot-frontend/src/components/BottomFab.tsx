import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomFabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  label?: string;
  offsetClassName?: string;
};

/**
 * Primary floating action button above the bottom nav / safe area.
 */
export function BottomFab({
  icon,
  label,
  className,
  offsetClassName,
  type = "button",
  ...props
}: BottomFabProps) {
  return (
    <button
      type={type}
      dir="rtl"
      className={cn(
        "fixed z-40 inline-flex items-center justify-center gap-2",
        "rounded-pill bg-primary text-primary-foreground shadow-fab",
        "font-bold transition hover:bg-primary/90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        label ? "h-12 px-5 text-sm" : "size-14",
        offsetClassName ?? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4",
        className,
      )}
      {...props}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
