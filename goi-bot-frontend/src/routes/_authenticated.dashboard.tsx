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
  Send, MessageCircle, ArrowLeft, Wallet, ShieldCheck, Eye, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "דאשבורד — Goi" }] }),
  component: DashboardPage,
});

async function loadStats() {
  return nestAdminDashboardStats();
}

const cards = [
  { label: "סה״כ שליחים", key: "total_couriers", icon: Bike, accent: "primary" },
  { label: "נרשמו היום", key: "registered_today", icon: UserPlus, accent: "info" },
  { label: "שליחים פעילים", key: "active_couriers", icon: CheckCircle2, accent: "primary" },
  { label: "ממתינים לאישור", key: "pending_approval", icon: Clock, accent: "warning" },
  { label: "מזמינים רשומים", key: "total_customers", icon: Users, accent: "info" },
  { label: "עבודות פתוחות", key: "open_jobs", icon: Briefcase, accent: "primary" },
  { label: "עבודות שנשלחו היום", key: "jobs_sent_today", icon: Send, accent: "info" },
  { label: "תגובות שליחים היום", key: "courier_replies_today", icon: MessageCircle, accent: "primary" },
] as const;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const value = isLoading ? "…" : data?.stats[c.key as keyof typeof data.stats] ?? 0;
          return (
            <Card key={c.key}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{c.label}</div>
                    <div className="text-3xl font-bold mt-2">{value}</div>
                  </div>
                  <div className={`size-10 rounded-lg grid place-items-center ${
                    c.accent === "primary" ? "bg-primary/10 text-primary"
                    : c.accent === "warning" ? "bg-amber-100 text-amber-700"
                    : "bg-sky-100 text-sky-700"
                  }`}>
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            דורש טיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(data?.attention ?? []).map((item) => (
              <li key={item.label}>
                <Link to={item.to as "/couriers"} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-md font-semibold text-sm ${
                      item.count > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {item.count}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {item.label.includes("משיכה") && <Wallet className="size-4" />}
                    <ArrowLeft className="size-4" />
                  </div>
                </Link>
              </li>
            ))}
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          בקשות שליחים ממתינות לאישור
          {pending.length > 0 && (
            <Badge variant="secondary" className="ml-2">{pending.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin inline ml-2" />טוען...</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">אין בקשות ממתינות 🎉</div>
        ) : (
          <ul className="divide-y">
            {pending.map((p) => (
              <li key={p.id} className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-muted/30">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold flex items-center gap-2">
                    {p.full_name}
                    <span className="text-xs text-muted-foreground font-normal font-mono">{p.whatsapp_phone}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📍 {p.base_city ?? "—"}</span>
                    <span>🚲 {p.vehicle_label ?? p.vehicle_type ?? "—"}</span>
                    {(p.max_distance as string[])?.length > 0 && <span>📏 {(p.max_distance as string[]).join(", ")}</span>}
                    {p.delivery_bag && <span>🎒 {p.delivery_bag}</span>}
                    <span>🧾 {p.invoice_status ?? "—"}</span>
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
