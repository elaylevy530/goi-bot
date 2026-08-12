import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type ListEmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Calm empty list placeholder — soft surface card, GOI tokens.
 * Prefer this for list screens; QueryStates.EmptyState remains for generic data states.
 */
export function ListEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: ListEmptyStateProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        "flex flex-col items-center justify-center rounded-card bg-surface px-6 py-12 text-center shadow-card",
        className,
      )}
    >
      <div className="mb-3 inline-flex size-12 items-center justify-center rounded-pill bg-muted text-text-muted">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <h3 className="text-base font-semibold text-text-strong">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
