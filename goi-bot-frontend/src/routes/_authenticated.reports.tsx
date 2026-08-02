import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nestListJobs } from "@/lib/nest-jobs";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "דוחות — Goi" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const iso = startOfMonth.toISOString();

  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const jobs = (await nestListJobs({ limit: 1000 })).filter((job) =>
        !job.created_at || job.created_at >= iso,
      );
      const total = jobs.length;
      const matched = jobs.filter((job) => Boolean(job.selected_courier_id)).length;
      return {
        total, completed: jobs.filter((job) => job.status === "הושלמה").length,
        matchRate: total > 0 ? Math.round((matched / total) * 100) : 0,
      };
    },
  });

  return (
    <AdminLayout title="דוחות" subtitle="מבט אנליטי על פעילות Goi">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">סה״כ עבודות החודש</div><div className="text-3xl font-bold mt-2">{data?.total ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">עבודות שהושלמו</div><div className="text-3xl font-bold mt-2">{data?.completed ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">אחוז איוש</div><div className="text-3xl font-bold mt-2 text-primary">{data?.matchRate ?? 0}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> פעילות שבועית</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/40 border rounded-md grid place-items-center text-muted-foreground">גרפים יחוברו בשלב הבא</div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
