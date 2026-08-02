import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobStatusBadge } from "@/components/StatusBadges";
import { nestListJobs } from "@/lib/nest-jobs";
import { Send } from "lucide-react";
import { MatchCouriersDialog } from "@/components/MatchCouriersDialog";
import { JobOutcomeDialog } from "@/components/JobOutcomeDialog";
import type { JobStatus } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "עבודות — Goi" }] }),
  component: JobsPage,
});

function JobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => nestListJobs({ limit: 500 }),
  });

  const jobIdsKey = useMemo(() => jobs.map((j: any) => j.id).join(","), [jobs]);
  const { data: latestSteps = {} } = useQuery({
    queryKey: ["admin-job-latest-steps", jobIdsKey],
    enabled: false,
    queryFn: async () => ({} as Record<string, string>),
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [qc]);

  return (
    <AdminLayout title="עבודות" subtitle={`${jobs.length} עבודות במערכת`} actions={
      <Button asChild><Link to="/send-job"><Send className="size-4" /> שליחת עבודה</Link></Button>
    }>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מס׳ עבודה</TableHead><TableHead>סוג</TableHead><TableHead>מזמין</TableHead>
                <TableHead>איסוף</TableHead><TableHead>מסירה</TableHead><TableHead>תאריך</TableHead>
                <TableHead>שעה</TableHead><TableHead>תשלום</TableHead><TableHead>סטטוס</TableHead>
                <TableHead>שלב שליח</TableHead><TableHead>שליחים מתאימים</TableHead><TableHead>שליח נבחר</TableHead><TableHead>התאמה</TableHead><TableHead>תוצאה</TableHead><TableHead>נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>}
              {!isLoading && jobs.length === 0 && (
                <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">אין עבודות עדיין. צור עבודה חדשה כדי להתחיל.</TableCell></TableRow>
              )}
              {jobs.map((j) => (
                <TableRow key={j.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold">{j.job_number}</TableCell>
                  <TableCell><Badge variant="secondary">{j.job_type}</Badge></TableCell>
                  <TableCell>{j.customer_name || "—"}</TableCell>
                  <TableCell className="max-w-[240px] align-top">
                    <div className="text-sm font-medium">{(j as any).pickup_address ?? j.pickup_area ?? "—"}</div>
                    {((j as any).pickup_contact_name || (j as any).pickup_contact_phone) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(j as any).pickup_contact_name}
                        {(j as any).pickup_contact_name && (j as any).pickup_contact_phone ? " · " : ""}
                        {(j as any).pickup_contact_phone}
                      </div>
                    )}
                    {(j as any).pickup_instructions && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2" title={(j as any).pickup_instructions}>
                        📝 {(j as any).pickup_instructions}
                      </div>
                    )}
                    {(j as any).pickup_ready === false && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        מוכן ב־{(j as any).pickup_ready_at ? new Date((j as any).pickup_ready_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{j.dropoff_area ?? "—"}</TableCell>
                  <TableCell className="text-sm">{j.job_date ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{j.job_time ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{Number(j.payment).toFixed(0)} ₪</TableCell>
                  <TableCell><JobStatusBadge status={j.status as JobStatus} courierStep={(j as any).courier_step} /></TableCell>
                  <TableCell>{(j as any).courier_step || (latestSteps as Record<string, string>)[j.id] ? <Badge variant="outline">{(j as any).courier_step || (latestSteps as Record<string, string>)[j.id]}</Badge> : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{j.matching_couriers_count}</Badge></TableCell>
                  <TableCell>{(j.couriers as any)?.full_name ?? "—"}</TableCell>
                  <TableCell><MatchCouriersDialog jobId={j.id} jobNumber={j.job_number} /></TableCell>
                  <TableCell><JobOutcomeDialog jobId={j.id} jobNumber={j.job_number} courierId={j.selected_courier_id} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString("he-IL")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AdminLayout>
  );
}
