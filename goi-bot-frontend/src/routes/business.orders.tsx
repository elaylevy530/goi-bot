import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobStatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import { nestCreateJob, nestGetJob, nestListJobs } from "@/lib/nest-jobs";
import { Search, Eye, Package, Repeat } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";
import type { JobStatus } from "@/lib/constants";

export const Route = createFileRoute("/business/orders")({
  head: () => ({ meta: [{ title: "המשלוחים שלי — Goi" }] }),
  ssr: false,
  component: OrdersPage,
});

const TABS: Array<{ key: string; label: string; statuses?: JobStatus[] }> = [
  { key: "all", label: "הכל" },
  { key: "open", label: "פתוחים", statuses: ["טיוטה", "נשלחה לשליחים", "ממתינה לתגובות"] },
  { key: "waiting", label: "ממתינים לשליח", statuses: ["נשלחה לשליחים", "ממתינה לתגובות"] },
  { key: "active", label: "פעילים", statuses: ["נבחר שליח", "פעילה", "יש שליחים שאישרו"] },
  { key: "done", label: "הושלמו", statuses: ["הושלמה"] },
  { key: "cancelled", label: "בוטלו", statuses: ["בוטלה"] },
  { key: "stuck", label: "תקועים", statuses: ["תקועה"] },
];

function OrdersPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const reorder = useMutation({
    mutationFn: async (jobId: string) => {
      if (!me) throw new Error("no profile");
      const full = await nestGetJob(jobId);
      if ((full as any).customer_id !== me.id) throw new Error("not found");
      const {
        id: _i,
        created_at,
        updated_at,
        job_number,
        status,
        selected_courier_id,
        selected_quote_id,
        recipient_tracking_token,
        ...rest
      } = full as any;
      return nestCreateJob({ ...rest, customer_id: me.id, status: "נשלחה לשליחים" });
    },
    onSuccess: (data) => {
      toast.success("משלוח חדש נוצר ✅");
      qc.invalidateQueries({ queryKey: ["business-orders"] });
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const { data: jobs } = useQuery({
    queryKey: ["business-orders", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListJobs({ limit: 200 }),
  });

  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["business-orders"] });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  const filtered = useMemo(() => {
    let list = jobs ?? [];
    const t = TABS.find(x => x.key === tab);
    if (t?.statuses) list = list.filter((j: any) => t.statuses!.includes(j.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j: any) =>
        j.job_number?.toLowerCase().includes(q) ||
        j.pickup_area?.toLowerCase().includes(q) ||
        j.dropoff_area?.toLowerCase().includes(q) ||
        j.couriers?.full_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, tab, search]);

  return (
    <BusinessShell title="המשלוחים שלי" subtitle={`${jobs?.length ?? 0} משלוחים בסך הכל`}>
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-x-auto">
              <TabsList className="h-auto flex-wrap justify-start">
                {TABS.map(t => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="relative md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי מספר / כתובת / שליח" className="pr-9" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="אין משלוחים בקטגוריה זו" desc="כשתזמין משלוח, הוא יופיע כאן." ctaLabel="הזמן משלוח" ctaTo="/business/new-delivery" />
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-2.5">
                {filtered.map((j: any) => (
                  <div key={j.id} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link to="/business/order/$id" params={{ id: j.id }} className="font-mono text-[13px] font-bold text-[#35AD29]">
                        {j.job_number}
                      </Link>
                      <JobStatusBadge status={j.status as JobStatus} courierStep={j.courier_step} />
                    </div>
                    <div className="text-[13px] text-slate-700 space-y-1 mb-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-400 text-[11px] shrink-0">איסוף:</span>
                        <span className="truncate">{j.pickup_area || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-400 text-[11px] shrink-0">מסירה:</span>
                        <span className="truncate">{j.dropoff_area || "—"}</span>
                      </div>
                      {j.couriers?.full_name && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-400 text-[11px] shrink-0">שליח:</span>
                          <span className="truncate">{j.couriers.full_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 truncate">
                        {j.job_date ? `${j.job_date} ${j.job_time || ""}` : new Date(j.created_at).toLocaleDateString("he-IL")}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-[15px]">₪{Number(j.payment || 0).toLocaleString("he-IL")}</span>
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                          <Link to="/business/order/$id" params={{ id: j.id }}><Eye className="size-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => reorder.mutate(j.id)} disabled={reorder.isPending}>
                          <Repeat className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-slate-100">
                      <th className="text-right py-2 font-semibold">מספר</th>
                      <th className="text-right py-2 font-semibold">סוג</th>
                      <th className="text-right py-2 font-semibold">איסוף</th>
                      <th className="text-right py-2 font-semibold">מסירה</th>
                      <th className="text-right py-2 font-semibold">שליח</th>
                      <th className="text-right py-2 font-semibold">סטטוס</th>
                      <th className="text-right py-2 font-semibold">זמן</th>
                      <th className="text-right py-2 font-semibold">מחיר</th>
                      <th className="text-right py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j: any) => (
                      <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 font-mono text-xs">
                          <Link to="/business/order/$id" params={{ id: j.id }} className="text-[#35AD29] hover:underline">{j.job_number}</Link>
                        </td>
                        <td className="py-3">{j.job_type}</td>
                        <td className="py-3 max-w-[140px] truncate">{j.pickup_area || "—"}</td>
                        <td className="py-3 max-w-[140px] truncate">{j.dropoff_area || "—"}</td>
                        <td className="py-3">{j.couriers?.full_name || <span className="text-slate-400">—</span>}</td>
                        <td className="py-3"><JobStatusBadge status={j.status as JobStatus} courierStep={j.courier_step} /></td>
                        <td className="py-3 text-xs text-slate-500">{j.job_date ? `${j.job_date} ${j.job_time || ""}` : new Date(j.created_at).toLocaleDateString("he-IL")}</td>
                        <td className="py-3 font-bold">₪{Number(j.payment || 0).toLocaleString("he-IL")}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button asChild variant="ghost" size="sm" title="צפה">
                              <Link to="/business/order/$id" params={{ id: j.id }}><Eye className="size-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="sm" title="הזמן שוב" onClick={() => reorder.mutate(j.id)} disabled={reorder.isPending}>
                              <Repeat className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </BusinessShell>
  );
}
