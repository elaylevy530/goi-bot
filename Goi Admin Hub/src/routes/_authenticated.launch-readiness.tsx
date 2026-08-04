import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runLaunchReadiness } from "@/lib/launch-readiness.functions";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/launch-readiness")({
  head: () => ({ meta: [{ title: "מוכנות להשקה — Goi" }] }),
  component: LaunchReadinessPage,
});

const STATUS_META = {
  READY: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, label: "מוכן" },
  WARNING: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle, label: "אזהרה" },
  BLOCKED: { color: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle, label: "חסום" },
} as const;

function LaunchReadinessPage() {
  const run = useServerFn(runLaunchReadiness);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => run(),
    refetchInterval: 60_000,
  });

  return (
    <AdminLayout
      title="מוכנות להשקה"
      subtitle="בדיקות אוטומטיות לפני יציאה לאוויר"
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} רענן
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : !data ? (
        <div className="text-center text-muted-foreground py-10">אין נתונים</div>
      ) : (
        <div className="space-y-4">
          <Card className={`border-2 ${STATUS_META[data.overall].color}`}>
            <CardContent className="p-5 flex items-center gap-4">
              {(() => {
                const Icon = STATUS_META[data.overall].icon;
                return <Icon className="size-10" />;
              })()}
              <div className="flex-1">
                <div className="text-2xl font-bold">{STATUS_META[data.overall].label}</div>
                <div className="text-sm opacity-80">
                  ✅ {data.ready} מוכנים · ⚠️ {data.warning} אזהרות · ⛔ {data.blocked} חסומים
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.checks.map((c) => {
              const meta = STATUS_META[c.status];
              const Icon = meta.icon;
              const content = (
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className={meta.color}>
                        <Icon className="size-3 me-1" /> {meta.label}
                      </Badge>
                      <div className="font-semibold text-end">{c.label}</div>
                    </div>
                    <div className="text-sm text-muted-foreground text-end">{c.detail}</div>
                    <div className="text-xs text-muted-foreground text-end">
                      נבדק: {new Date(c.lastChecked).toLocaleTimeString("he-IL")}
                    </div>
                  </CardContent>
                </Card>
              );
              return c.link ? (
                <Link key={c.id} to={c.link as never}>{content}</Link>
              ) : (
                <div key={c.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
