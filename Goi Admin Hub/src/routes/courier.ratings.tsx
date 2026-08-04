import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export const Route = createFileRoute("/courier/ratings")({
  head: () => ({ meta: [{ title: "דירוגים — Goi" }] }),
  component: RatingsPage,
});

function RatingsPage() {
  const { data: me } = useMyCourier();

  const { data: stats } = useQuery({
    queryKey: ["ratings-stats", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase.from("courier_stats").select("*").eq("courier_id", me!.id).maybeSingle();
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["ratings-reviews", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("job_outcomes")
        .select("id, customer_rating, customer_comment, delivered_at, jobs(job_number, job_type, customer_name)")
        .eq("courier_id", me!.id)
        .not("customer_rating", "is", null)
        .order("delivered_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const completionRate = stats ? (stats.jobs_completed / Math.max(1, stats.jobs_completed + stats.jobs_cancelled) * 100).toFixed(0) : "—";
  const fmtSec = (s: number) => { if (!s) return "—"; const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <CourierShell title="דירוגים וביצועים" subtitle="הביצועים שלך לאורך זמן">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "דירוג ממוצע", value: stats?.avg_rating ? Number(stats.avg_rating).toFixed(2) : "—" },
          { label: "מספר דירוגים", value: reviews.length },
          { label: "אחוז השלמות", value: `${completionRate}%` },
          { label: "זמן תגובה ממוצע", value: fmtSec(stats?.avg_response_seconds ?? 0) },
        ].map((k) => (
          <Card key={k.label} className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5 text-end">
              <div className="text-xs text-slate-500 mb-2">{k.label}</div>
              <div className="text-3xl font-extrabold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <h2 className="font-bold text-end mb-4">ביקורות אחרונות</h2>
          {reviews.length === 0 ? (
            <div className="py-10 text-center text-slate-500"><Star className="size-10 mx-auto mb-2 opacity-50" /> אין עדיין ביקורות</div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className={`size-4 ${i <= Math.round(Number(r.customer_rating)) ? "fill-[#35AD29] text-[#35AD29]" : "text-slate-300"}`} />
                      ))}
                    </div>
                    <div className="text-end">
                      <div className="text-sm font-semibold">{r.jobs?.customer_name ?? "לקוח"}</div>
                      <div className="text-xs text-slate-500">#{r.jobs?.job_number} · {r.delivered_at && new Date(r.delivered_at).toLocaleDateString("he-IL")}</div>
                    </div>
                  </div>
                  {r.customer_comment && <p className="text-sm text-end text-slate-700">{r.customer_comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </CourierShell>
  );
}
