import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  leading?: ReactNode;
  className?: string;
  sticky?: boolean;
};

/**
 * Thin page title row for app shells — RTL-first, token-based.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  leading,
  className,
  sticky = false,
}: PageHeaderProps) {
  return (
    <header
      dir="rtl"
      className={cn(
        "bg-surface/95 backdrop-blur border-b border-border",
        sticky && "sticky top-0 z-30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 text-right">
        <div className="min-w-0 flex items-start gap-2">
          {leading}
          <div className="min-w-0">
            <h1 className="text-xl font-black text-text-strong truncate">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-text-muted truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
