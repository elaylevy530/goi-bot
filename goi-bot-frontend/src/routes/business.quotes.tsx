import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nestListJobs, nestListJobQuotes, nestSelectJobQuote, nestUpdateJob } from "@/lib/nest-jobs";
import { CheckCircle2, Loader2, Star, Inbox, XCircle, MapPin, Clock, HandCoins, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/quotes")({
  head: () => ({ meta: [{ title: "הצעות משליחים — Goi עסקים" }] }),
  ssr: false,
  component: BusinessQuotesPage,
});

function BusinessQuotesPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["business-quote-jobs", me?.id],
    enabled: !!me?.id,
    refetchInterval: 10_000,
    queryFn: async () => (await nestListJobs({ limit: 1000 })).filter((job) => job.pricing_type === "quote_request"),
  });

  const jobIds = jobs.map((j: any) => j.id);
  const { data: quotes = [] } = useQuery({
    queryKey: ["business-quotes", me?.id, jobIds.join(",")],
    enabled: jobIds.length > 0,
    refetchInterval: 10_000,
    queryFn: async () => (await Promise.all(jobIds.map(nestListJobQuotes))).flat(),
  });

  const select = useMutation({
    mutationFn: async (quoteId: string) => {
      const quote = quotes.find((item: any) => item.id === quoteId) as any;
      if (!quote?.job_id) throw new Error("הצעת המחיר אינה זמינה");
      return nestSelectJobQuote(quote.job_id, quoteId);
    },
    onSuccess: () => {
      toast.success("בחרת שליח — נשלחה הודעה");
      qc.invalidateQueries({ queryKey: ["business-quote-jobs"] });
      qc.invalidateQueries({ queryKey: ["business-quotes"] });
      qc.invalidateQueries({ queryKey: ["business-recent"] });
      qc.invalidateQueries({ queryKey: ["business-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      await nestUpdateJob(jobId, { status: "בוטלה" });
    },
    onSuccess: () => {
      toast.success("הבקשה בוטלה");
      qc.invalidateQueries({ queryKey: ["business-quote-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openJobs = jobs.filter((j: any) => !j.selected_quote_id && !["בוטלה", "הושלמה"].includes(j.status));
  const closedJobs = jobs.filter((j: any) => j.selected_quote_id || ["בוטלה", "הושלמה"].includes(j.status));

  return (
    <BusinessShell title="הצעות משליחים" subtitle="בחר את ההצעה הטובה ביותר עבורך — לפי מחיר, זמן הגעה ודירוג">
      {isLoading && <div className="text-center py-10 text-slate-500">טוען...</div>}

      {!isLoading && jobs.length === 0 && (
        <Card className="rounded-2xl"><CardContent className="py-14 text-center text-slate-500">
          <Inbox className="size-10 mx-auto mb-3 opacity-50" />
          <div className="font-bold text-slate-700 mb-1">אין בקשות הצעות מחיר</div>
          <div className="text-sm mb-4">פתח משלוח חדש במצב "מכרז" כדי לקבל הצעות משליחים</div>
          <Button asChild className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
            <Link to="/business/new-delivery">משלוח חדש</Link>
          </Button>
        </CardContent></Card>
      )}

      {openJobs.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="font-bold text-lg text-end">פתוחות לבחירה ({openJobs.length})</h2>
          {openJobs.map((j: any) => {
            const jqRaw = quotes.filter((q: any) => q.job_id === j.id);
            // Rank by combined score: cheap + fast + good rating
            const minPrice = jqRaw.length ? Math.min(...jqRaw.map((q: any) => Number(q.price) || Infinity)) : 0;
            const jq = jqRaw
              .map((q: any) => {
                const price = Number(q.price) || 0;
                const arrival = Number(q.estimated_arrival_minutes ?? 30);
                const rating = Number(q.courier_rating_snapshot ?? 4.0);
                const completed = Math.min(Number(q.courier_completed_jobs_snapshot ?? 0), 100);
                const score =
                  (price > 0 ? (minPrice / price) * 50 : 0) +
                  rating * 8 +
                  Math.max(0, 30 - arrival) * 0.5 +
                  completed * 0.05;
                return { ...q, _score: score };
              })
              .sort((a: any, b: any) => b._score - a._score);
            return (
              <Card key={j.id} className="rounded-2xl border-amber-200 bg-amber-50/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => cancelJob.mutate(j.id)} disabled={cancelJob.isPending}>
                      <XCircle className="size-3" /> בטל בקשה
                    </Button>
                    <div className="text-end">
                      <div className="font-bold text-slate-900">{j.job_type} · <span className="font-mono text-xs text-slate-500">#{j.job_number}</span></div>
                      <div className="text-xs text-slate-500 mt-1">
                        <MapPin className="inline size-3 ml-1" /> {j.pickup_address || j.pickup_area || "—"} ← {j.dropoff_address || j.dropoff_area || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        <Clock className="inline size-3 ml-1" /> {j.job_date || "—"} {j.job_time || ""}
                      </div>
                    </div>
                  </div>

                  {jq.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-white rounded-xl p-4 text-center">
                      ⏳ ממתינים להצעות משליחים — תקבל התראה כשתתקבל הצעה
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="text-xs text-slate-600 text-end mb-1">{jq.length} הצעות התקבלו · 3 המומלצות מסומנות (זול · מהיר · מדורג)</div>
                      {jq.map((q: any, idx: number) => {
                        const isTop = idx < 3;
                        const isBest = idx === 0;
                        return (
                          <div key={q.id} className={`rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap border bg-white ${isBest ? "border-emerald-300 ring-1 ring-emerald-200" : isTop ? "border-emerald-200" : "border-slate-200"}`}>
                            <Button size="sm" className="bg-[#35AD29] hover:bg-[#2d9623] text-white"
                              onClick={() => select.mutate(q.id)} disabled={select.isPending}>
                              {select.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} בחר שליח זה
                            </Button>
                            <div className="flex-1 text-end min-w-[160px]">
                              <div className="font-bold flex items-center gap-2 justify-end">
                                {isBest && <Badge className="bg-emerald-600 text-white">מומלץ</Badge>}
                                {!isBest && isTop && <Badge variant="outline" className="border-emerald-300 text-emerald-700">טופ {idx + 1}</Badge>}
                                <span>{(q.couriers as any)?.full_name || "שליח"}</span>
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                                {q.courier_rating_snapshot && (<><Star className="size-3 text-amber-500" /> {Number(q.courier_rating_snapshot).toFixed(1)} ·</>)}
                                {q.courier_completed_jobs_snapshot != null && <span>{q.courier_completed_jobs_snapshot} עבודות ·</span>}
                                <span>הגעה: {q.estimated_arrival_minutes ?? "—"} דק׳</span>
                              </div>
                              {(q.couriers as any)?.vehicle_type && (
                                <div className="text-xs text-slate-500"><Truck className="inline size-3 ml-1" />{(q.couriers as any).vehicle_type}</div>
                              )}
                              {q.note && <div className="text-xs bg-slate-50 rounded p-1 mt-1">{q.note}</div>}
                            </div>
                            <div className="text-end">
                              <div className={`text-2xl font-extrabold ${isBest ? "text-[#35AD29]" : "text-slate-800"}`}>{Number(q.price).toFixed(0)} ₪</div>
                            </div>
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
      )}

      {closedJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-lg text-end text-slate-700">היסטוריה</h2>
          {closedJobs.map((j: any) => {
            const sel = quotes.find((q: any) => q.id === j.selected_quote_id);
            return (
              <Card key={j.id} className="rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="outline">{j.status}</Badge>
                  <div className="text-end flex-1">
                    <div className="font-bold text-sm">{j.job_type} · #{j.job_number}</div>
                    {sel && <div className="text-xs text-slate-500">נבחר: {(sel.couriers as any)?.full_name} · {Number(sel.price).toFixed(0)} ₪</div>}
                  </div>
                  <Button asChild size="sm" variant="ghost"><Link to="/business/order/$id" params={{ id: j.id }}>פתח</Link></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <Button asChild variant="outline">
          <Link to="/business/new-delivery"><HandCoins className="size-4" /> בקשת הצעת מחיר חדשה</Link>
        </Button>
      </div>
    </BusinessShell>
  );
}
