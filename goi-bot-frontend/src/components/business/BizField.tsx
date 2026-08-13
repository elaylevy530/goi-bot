import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BizField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-right">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-text-subtle">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {hint ? <span className="text-[11px] text-text-muted">{hint}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] font-medium text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function bizControlClass(hasError?: boolean) {
  return cn(
    "biz-input",
    hasError && "border-destructive/50 focus:shadow-[0_0_0_2px_color-mix(in_oklab,var(--destructive)_30%,transparent)]",
  );
}
