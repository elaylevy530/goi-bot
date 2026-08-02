import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nestListJobs, nestListJobQuotes, nestSelectJobQuote, nestUpdateJob } from "@/lib/nest-jobs";
import { CheckCircle2, Loader2, Star, Inbox, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quote-requests")({
  head: () => ({ meta: [{ title: "בקשות הצעות מחיר — Goi" }] }),
  component: QuoteRequestsPage,
});

const QSTAT: Record<string, { label: string; cls: string }> = {
  pending: { label: "ממתין", cls: "bg-slate-100 text-slate-700" },
  shortlisted: { label: "הוצג למזמין", cls: "bg-amber-100 text-amber-800" },
  selected: { label: "נבחרה", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "נדחתה", cls: "bg-rose-100 text-rose-800" },
  expired: { label: "פג תוקף", cls: "bg-slate-100 text-slate-500" },
  cancelled: { label: "בוטלה", cls: "bg-slate-100 text-slate-500" },
};

function QuoteRequestsPage() {
  const qc = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["admin-quote-requests"],
    refetchInterval: 15000,
    queryFn: async () => (await nestListJobs({ limit: 1000 })).filter((job) => job.pricing_type === "quote_request"),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["admin-quotes", jobs.map((j: any) => j.id).join(",")],
    enabled: jobs.length > 0,
    refetchInterval: 15000,
    queryFn: async () => (await Promise.all(jobs.map((job: any) => nestListJobQuotes(job.id)))).flat(),
  });

  const select = useMutation({
    mutationFn: async (quoteId: string) => {
      const quote = quotes.find((item: any) => item.id === quoteId) as any;
      if (!quote?.job_id) throw new Error("הצעת המחיר אינה זמינה");
      await nestSelectJobQuote(quote.job_id, quoteId);
    },
    onSuccess: () => {
      toast.success("ההצעה נבחרה");
      qc.invalidateQueries({ queryKey: ["admin-quote-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      await nestUpdateJob(jobId, { status: "בוטלה" });
    },
    onSuccess: () => {
      toast.success("הבקשה בוטלה");
      qc.invalidateQueries({ queryKey: ["admin-quote-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout title="בקשות הצעות מחיר" subtitle={`${jobs.length} בקשות במערכת`}>
      {isLoading && <p className="text-sm text-muted-foreground">טוען...</p>}
      {!isLoading && jobs.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Inbox className="size-10 mx-auto mb-3 opacity-50" /> אין בקשות הצעות מחיר עדיין
        </CardContent></Card>
      )}
      <div className="space-y-4">
        {jobs.map((j: any) => {
          const jobQuotes = quotes.filter((q: any) => q.job_id === j.id);
          const isClosed = j.selected_quote_id || ["בוטלה", "הושלמה"].includes(j.status as string);
          return (
            <Card key={j.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{j.status}</Badge>
                    {j.selected_quote_id && <Badge className="bg-emerald-100 text-emerald-800">נבחרה הצעה</Badge>}
                    {!isClosed && (
                      <Button size="sm" variant="outline" onClick={() => cancelJob.mutate(j.id)}>
                        <XCircle className="size-3" /> בטל בקשה
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-end">
                    {j.job_number} · {j.job_type}
                    <div className="text-xs font-normal text-muted-foreground">
                      {(j.customers as any)?.business_name || (j.customers as any)?.name || j.customer_name || "—"}
                    </div>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2 text-end mb-3">
                  <div>📦 איסוף: {j.pickup_address || j.pickup_area || "—"}</div>
                  <div>🎯 מסירה: {j.dropoff_address || j.dropoff_area || "—"}</div>
                  <div>📅 {j.job_date || "—"} {j.job_time || ""}</div>
                </div>

                {jobQuotes.length === 0 ? (
                  <div className="text-sm text-slate-500">עדיין לא התקבלו הצעות.</div>
                ) : (
                  <div className="grid gap-2">
                    {jobQuotes.map((q: any) => {
                      const meta = QSTAT[q.status] ?? { label: q.status, cls: "bg-slate-100" };
                      return (
                        <div key={q.id} className="border rounded-xl p-3 flex items-start justify-between gap-3 flex-wrap bg-white">
                          <div className="text-end">
                            <div className="text-xl font-extrabold text-[#35AD29]">{Number(q.price).toFixed(0)} ₪</div>
                            <Badge className={meta.cls + " mt-1"}>{meta.label}</Badge>
                          </div>
                          <div className="flex-1 text-end min-w-[140px]">
                            <div className="font-bold">{(q.couriers as any)?.full_name}</div>
                            <div className="text-xs text-slate-500">{(q.couriers as any)?.whatsapp_phone} · {(q.couriers as any)?.vehicle_type ?? ""}</div>
                            <div className="text-xs flex items-center gap-1 justify-end mt-1">
                              {q.courier_rating_snapshot && (<><Star className="size-3 text-amber-500" /> {Number(q.courier_rating_snapshot).toFixed(1)}</>)}
                              {q.courier_completed_jobs_snapshot != null && <span>· {q.courier_completed_jobs_snapshot} עבודות</span>}
                              <span>· הגעה: {q.estimated_arrival_minutes ?? "—"} דק׳</span>
                            </div>
                            {q.note && <div className="text-xs bg-slate-50 rounded p-1 mt-1">{q.note}</div>}
                          </div>
                          {!j.selected_quote_id && (q.status === "pending" || q.status === "shortlisted") && (
                            <Button size="sm" className="bg-[#35AD29] hover:bg-[#2d9623] text-white"
                              onClick={() => select.mutate(q.id)}
                              disabled={select.isPending}>
                              {select.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} בחר ידנית
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
