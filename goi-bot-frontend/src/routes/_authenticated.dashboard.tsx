import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nestAdminDashboardStats, nestListCouriers } from "@/lib/nest-accounts";
import { approveCourier } from "@/lib/courier-intake.functions";
import {
  Bike, UserPlus, CheckCircle2, Clock, Users, Briefcase,
  Send, MessageCircle, ArrowLeft, Wallet, ShieldCheck, Eye, Loader2, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "דאשבורד — Goi" }] }),
  component: DashboardPage,
});

async function loadStats() {
  return nestAdminDashboardStats();
}

type Accent = "primary" | "success" | "warning" | "info";

const accentIconCls: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  info: "bg-info-bg text-info-text",
};

/** Ops KPIs — dense scan row */
const opsCards = [
  { label: "עבודות פתוחות", key: "open_jobs", icon: Briefcase, accent: "primary" as const },
  { label: "נשלחו היום", key: "jobs_sent_today", icon: Send, accent: "info" as const },
  { label: "תגובות היום", key: "courier_replies_today", icon: MessageCircle, accent: "success" as const },
  { label: "מזמינים", key: "total_customers", icon: Users, accent: "info" as const },
] as const;

/** Courier KPIs */
const courierCards = [
  { label: "סה״כ שליחים", key: "total_couriers", icon: Bike, accent: "primary" as const },
  { label: "שליחים פעילים", key: "active_couriers", icon: CheckCircle2, accent: "success" as const },
  { label: "נרשמו היום", key: "registered_today", icon: UserPlus, accent: "info" as const },
  { label: "ממתינים לאישור", key: "pending_approval", icon: Clock, accent: "warning" as const },
] as const;

/** Map legacy Nest attention paths to current admin routes */
function attentionHref(item: { label: string; to: string }): string {
  if (item.label.includes("עבודות") || item.to === "/jobs") return "/active-jobs";
  if (item.to === "/couriers" || item.to.startsWith("/couriers?")) return "/couriers-admin";
  return item.to;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Bike;
  accent: Accent;
}) {
  return (
    <Card className="rounded-card shadow-card border-border/60 bg-surface">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 text-right">
            <div className="text-xs text-text-muted font-medium">{label}</div>
            <div className="text-2xl lg:text-3xl font-bold mt-1 text-text-strong tabular-nums">{value}</div>
          </div>
          <div className={cn("size-9 rounded-lg grid place-items-center shrink-0", accentIconCls[accent])}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: loadStats });

  useEffect(() => {
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["pending-couriers"] });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [qc]);

  const openJobs = isLoading ? null : (data?.stats.open_jobs ?? 0);
  const unassigned = data?.attention?.find((a) => a.label.includes("עבודות בלי שליח"));
  const unassignedCount = unassigned?.count ?? 0;

  return (
    <AdminLayout
      title="דאשבורד"
      subtitle="מבט מהיר על המצב התפעולי של Goi"
      actions={
        <Button asChild>
          <Link to="/send-job"><Send className="size-4" /> שליחת עבודה חדשה</Link>
        </Button>
      }
    >
      {/* Active jobs — primary ops focus */}
      <Link
        to="/active-jobs"
        className="block mb-6 rounded-card shadow-card border border-primary/25 bg-surface overflow-hidden hover:border-primary/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          <div className="flex-1 p-5 sm:p-6 text-right">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Activity className="size-4" />
              משלוחים פעילים
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-extrabold text-text-strong tabular-nums">
                {openJobs === null ? "…" : openJobs}
              </span>
              <span className="text-sm text-text-muted">עבודות פתוחות כרגע</span>
            </div>
            {unassignedCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold bg-warning-bg text-warning-text">
                <span className="size-1.5 rounded-full bg-warning animate-pulse" />
                {unassignedCount} בלי שליח — דורש שיבוץ
              </div>
            )}
          </div>
          <div className="sm:w-44 bg-primary/5 border-t sm:border-t-0 sm:border-s border-primary/15 flex items-center justify-center gap-2 p-4 text-primary font-semibold text-sm">
            ללוח הפעילים
            <ArrowLeft className="size-4" />
          </div>
        </div>
      </Link>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-text-strong mb-3">תפעול</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {opsCards.map((c) => {
            const value = isLoading ? "…" : data?.stats[c.key as keyof typeof data.stats] ?? 0;
            return <KpiCard key={c.key} label={c.label} value={value} icon={c.icon} accent={c.accent} />;
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold text-text-strong mb-3">שליחים</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {courierCards.map((c) => {
            const value = isLoading ? "…" : data?.stats[c.key as keyof typeof data.stats] ?? 0;
            return <KpiCard key={c.key} label={c.label} value={value} icon={c.icon} accent={c.accent} />;
          })}
        </div>
      </section>

      <Card className="rounded-card shadow-card border-border/60 bg-surface">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-text-strong">
            <span className="size-2 rounded-full bg-warning animate-pulse" />
            דורש טיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(data?.attention ?? []).map((item) => {
              const href = attentionHref(item);
              return (
                <li key={item.label}>
                  <Link
                    to={href as "/active-jobs"}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-md font-semibold text-sm",
                          item.count > 0
                            ? "bg-warning-bg text-warning-text"
                            : "bg-muted text-text-muted",
                        )}
                      >
                        {item.count}
                      </span>
                      <span className="font-medium text-text-strong">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      {item.label.includes("משיכה") && <Wallet className="size-4" />}
                      <ArrowLeft className="size-4" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <PendingCouriersPanel />
    </AdminLayout>
  );
}

function PendingCouriersPanel() {
  const qc = useQueryClient();
  const approve = useServerFn(approveCourier);
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-couriers"],
    queryFn: () => nestListCouriers({ status: "ממתין לאישור", limit: 50 }),
  });
  const mut = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended?: boolean }) => approve({ data: { id, suspended } }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["pending-couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["couriers"] });
      toast.success(vars.suspended ? "השליח אושר במצב מושהה — לא יקבל עבודות עד הפעלה ידנית" : "השליח אושר ונשלחה הודעת אישור");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6 rounded-card shadow-card border-border/60 bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-text-strong">
          <ShieldCheck className="size-5 text-primary" />
          בקשות שליחים ממתינות לאישור
          {pending.length > 0 && (
            <Badge className="bg-warning-bg text-warning-text border-warning/30" variant="outline">
              {pending.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin inline ml-2" />
            טוען...
          </div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">אין בקשות ממתינות</div>
        ) : (
          <ul className="divide-y">
            {pending.map((p) => (
              <li key={p.id} className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-muted/30">
                <div className="flex-1 min-w-[200px] text-right">
                  <div className="font-semibold flex items-center gap-2 text-text-strong">
                    {p.full_name}
                    <span className="text-xs text-text-muted font-normal font-mono">{p.whatsapp_phone}</span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{p.base_city ?? "—"}</span>
                    <span>{p.vehicle_label ?? p.vehicle_type ?? "—"}</span>
                    {(p.max_distance as string[])?.length > 0 && <span>{(p.max_distance as string[]).join(", ")}</span>}
                    {p.delivery_bag && <span>{p.delivery_bag}</span>}
                    <span>{p.invoice_status ?? "—"}</span>
                  </div>
                  {((p.working_areas as string[])?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(p.working_areas as string[]).slice(0, 4).map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/couriers/$id" params={{ id: p.id }}>
                      <Eye className="size-4" /> צפייה
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: p.id, suspended: true })} disabled={mut.isPending}>
                    אשר כמושהה
                  </Button>
                  <Button size="sm" onClick={() => mut.mutate({ id: p.id })} disabled={mut.isPending}>
                    {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    אשר כפעיל
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
