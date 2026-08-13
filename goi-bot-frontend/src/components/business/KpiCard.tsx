import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  delta,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string;
  delta?: string | null;
  icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-kpi">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-subtle">{title}</p>
        <div className={cn("grid size-9 place-items-center rounded-md", iconClass)}>
          <Icon className="size-5" strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[1.75rem] font-bold leading-none text-text-strong">{value}</p>
        {delta ? (
          <span className="rounded-md bg-success-bg px-2 py-1 text-xs font-bold text-success-text">
            {delta}
          </span>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
