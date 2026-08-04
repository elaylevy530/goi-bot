/**
 * Reusable empty / loading / error states for data-driven screens.
 */
import { Loader2, Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { extractErrorMessage } from "@/lib/error-toast";

export function Loading({ label = "טוען…" }: { label?: string }) {
  return (
    <div dir="rtl" className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "טעינת הנתונים נכשלה",
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const msg = extractErrorMessage(error);
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{msg}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> נסה שוב
        </button>
      )}
    </div>
  );
}
