import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { nestListJobs } from "@/lib/nest-jobs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Package, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/business/analytics")({
  head: () => ({ meta: [{ title: "אנליטיקות — Goi" }] }),
  ssr: false,
  component: AnalyticsPage,
});

const COLORS = ["#35AD29", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function AnalyticsPage() {
  const { data: me } = useMyBusiness();

  const { data: jobs = [] } = useQuery({
    queryKey: ["analytics-jobs", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const all = await nestListJobs({ limit: 500 });
      return all.filter((j) => {
        const created = j.created_at ? new Date(String(j.created_at)) : null;
        return created && created >= since;
      });
    },
  });

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j: any) => j.status === "הושלמה").length;
    const spend = jobs.reduce((s: number, j: any) => s + Number(j.customer_price || j.final_price || j.payment || 0), 0);
    const avg = completed ? Math.round(spend / completed) : 0;
    return { total, completed, spend, avg };
  }, [jobs]);

  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const j of jobs as any[]) {
      const d = new Date(j.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[key] = (m[key] || 0) + Number(j.customer_price || j.final_price || j.payment || 0);
    }
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: k, spend: v }));
  }, [jobs]);

  const byArea = useMemo(() => {
    const m: Record<string, number> = {};
    for (const j of jobs as any[]) {
      const k = j.dropoff_area || "לא ידוע";
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  return (
    <BusinessShell title="אנליטיקות" subtitle="ניתוח הוצאות ומשלוחים — 6 חודשים אחרונים">
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={Package} label="משלוחים" value={stats.total} />
          <Kpi icon={Clock} label="הושלמו" value={stats.completed} />
          <Kpi icon={TrendingUp} label='סה"כ הוצאה' value={`₪${stats.spend.toLocaleString("he-IL")}`} />
          <Kpi icon={MapPin} label="ממוצע למשלוח" value={`₪${stats.avg.toLocaleString("he-IL")}`} />
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="font-extrabold text-slate-900 mb-3">הוצאות לפי חודש</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="spend" fill="#35AD29" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="font-extrabold text-slate-900 mb-3">אזורי מסירה מובילים</div>
            {byArea.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8">אין נתונים עדיין</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byArea} dataKey="value" nameKey="name" outerRadius={90} label>
                      {byArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs"><Icon className="size-4" /> {label}</div>
        <div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
