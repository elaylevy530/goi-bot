import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MapPin, User, Phone, Share2, Copy, Navigation, Star } from "lucide-react";
import { JobStatusBadge } from "@/components/StatusBadges";
import { CourierAvatar } from "@/components/CourierAvatar";
import { toast } from "sonner";
import type { JobStatus } from "@/lib/constants";

export const Route = createFileRoute("/business/track/$id")({
  head: () => ({ meta: [{ title: "מעקב משלוח — Goi" }] }),
  ssr: false,
  component: TrackPage,
});

function TrackPage() {
  const { id } = Route.useParams();
  const { data: me } = useMyBusiness();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);

  const { data: job } = useQuery({
    queryKey: ["track-job", id, me?.id],
    enabled: !!me?.id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase.from("jobs")
        .select("*, couriers:selected_courier_id(id, full_name, whatsapp_phone, vehicle_type, vehicle_label, base_city, avatar_url, last_lat, last_lng, last_location_at)")
        .eq("id", id).eq("customer_id", me!.id).maybeSingle();
      return data;
    },
  });

  const j: any = job;
  const c = j?.couriers;
  const courierId = j?.selected_courier_id as string | undefined;

  const { data: stats } = useQuery({
    queryKey: ["courier-stats-track", courierId],
    enabled: !!courierId,
    queryFn: async () => {
      const { data } = await supabase.from("courier_stats")
        .select("avg_rating, jobs_completed, on_time_rate")
        .eq("courier_id", courierId!).maybeSingle();
      return data;
    },
  });

  if (!job) return <BusinessShell title="טוען..."><div className="p-8 text-center text-slate-500">טוען...</div></BusinessShell>;

  const trackUrl = typeof window !== "undefined" && j.recipient_tracking_token
    ? `${window.location.origin}/track/${j.recipient_tracking_token}`
    : "";

  const shareWithRecipient = async () => {
    if (!trackUrl) return;
    if (navigator.share) {
      try { await navigator.share({ title: `מעקב משלוח ${j.job_number}`, url: trackUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(trackUrl);
      toast.success("הקישור הועתק");
    }
  };

  const mapsUrl = c?.last_lat && c?.last_lng
    ? `https://www.google.com/maps?q=${c.last_lat},${c.last_lng}&z=15&output=embed`
    : null;

  const lastSeenMin = c?.last_location_at ? Math.round((now - new Date(c.last_location_at).getTime()) / 60_000) : null;

  return (
    <BusinessShell title={`מעקב משלוח ${j.job_number}`} subtitle={j.job_type}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button asChild variant="ghost" size="sm"><Link to="/business/order/$id" params={{ id }}><ArrowRight className="size-4" /> חזרה לפרטים</Link></Button>
          <div className="flex gap-2">
            <JobStatusBadge status={j.status as JobStatus} courierStep={j.courier_step} />
            {trackUrl && (
              <>
                <Button variant="outline" size="sm" onClick={shareWithRecipient}><Share2 className="size-4" /> שתף עם הנמען</Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(trackUrl); toast.success("הקישור הועתק"); }}><Copy className="size-4" /> העתק קישור</Button>
              </>
            )}
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {mapsUrl ? (
              <div className="aspect-[16/10] w-full bg-slate-100">
                <iframe title="מפת שליח" src={mapsUrl} className="w-full h-full border-0" loading="lazy" />
              </div>
            ) : (
              <div className="aspect-[16/10] w-full bg-slate-100 grid place-items-center text-slate-400 text-sm">
                <div className="text-center">
                  <Navigation className="size-8 mx-auto mb-2 opacity-40" />
                  {c ? "השליח עדיין לא שיתף מיקום" : "טרם נבחר שליח"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><User className="size-4 text-[#35AD29]" /> שליח</h3>
              {c ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CourierAvatar path={(c as any).avatar_url} name={c.full_name} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-base text-slate-900 truncate">{c.full_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        {c.vehicle_type && <span>🛵 {(c as any).vehicle_label || c.vehicle_type}</span>}
                        {(c as any).base_city && <><span className="text-slate-300">•</span><span>📍 {(c as any).base_city}</span></>}
                      </div>
                      {stats && (
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          {stats.avg_rating != null && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              {Number(stats.avg_rating).toFixed(1)}
                            </span>
                          )}
                          {(stats.jobs_completed ?? 0) > 0 && (
                            <span className="text-slate-600 font-semibold">{stats.jobs_completed} משלוחים</span>
                          )}
                          {stats.on_time_rate != null && (
                            <span className="text-blue-600 font-semibold">{Math.round(Number(stats.on_time_rate) * 100)}% בזמן</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {c.whatsapp_phone && <a href={`tel:${c.whatsapp_phone}`} className="flex items-center gap-2 text-[#35AD29] hover:underline text-sm font-semibold"><Phone className="size-4" /> {c.whatsapp_phone}</a>}
                  {lastSeenMin !== null && <div className="text-xs text-slate-400">מיקום עודכן {lastSeenMin === 0 ? "ברגע זה" : `לפני ${lastSeenMin} דק׳`}</div>}
                </div>
              ) : <div className="text-sm text-slate-500">מחפשים שליח...</div>}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><MapPin className="size-4 text-rose-500" /> נקודות</h3>
              <div className="text-sm space-y-2">
                <div><div className="text-xs text-slate-500">איסוף</div><div className="font-semibold">{j.pickup_address || j.pickup_area}</div></div>
                <div><div className="text-xs text-slate-500">מסירה</div><div className="font-semibold">{j.dropoff_address || j.dropoff_area}</div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BusinessShell>
  );
}
