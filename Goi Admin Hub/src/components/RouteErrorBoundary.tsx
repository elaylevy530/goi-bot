/**
 * Reusable route-level error UI. Use as `errorComponent` on createFileRoute.
 */
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route-error]", error);
    reportLovableError(error, { boundary: "route_error_boundary" });
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">העמוד לא נטען כראוי</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          משהו השתבש. אפשר לנסות שוב או לחזור מאוחר יותר.
        </p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> נסה שוב
        </button>
      </div>
    </div>
  );
}
