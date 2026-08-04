import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Truck, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/track/stop/$token")({
  head: () => ({ meta: [{ title: "מעקב משלוח — Goi" }] }),
  ssr: false,
  component: TrackStopPage,
});

type StopTrack = {
  job_number?: string;
  stop_status: "pending" | "arrived" | "done" | "skipped";
  stop_type: "pickup" | "dropoff";
  address?: string;
  area?: string;
  contact_name?: string;
  package_description?: string;
  number_of_packages?: number;
  arrived_at?: string | null;
  done_at?: string | null;
  stops_before_me?: number;
  courier?: {
    full_name: string;
    vehicle_type?: string | null;
    last_lat?: number | null;
    last_lng?: number | null;
  } | null;
};

function TrackStopPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<StopTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/track-stop/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? "המשלוח לא נמצא" : "שגיאה");
          return;
        }
        const j = await res.json();
        if (!cancelled) setData(j as StopTrack);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה");
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [token]);

  if (error)
    return (
      <Centered>
        <div className="text-slate-500">{error}</div>
      </Centered>
    );
  if (!data) return <Centered>טוען…</Centered>;

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "ממתין", color: "bg-slate-100 text-slate-700", icon: Clock },
    arrived: { label: "השליח הגיע", color: "bg-amber-100 text-amber-800", icon: MapPin },
    done: { label: "נמסר", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    skipped: { label: "דולג", color: "bg-rose-100 text-rose-800", icon: Clock },
  };
  const st = statusMap[data.stop_status];
  const StIcon = st.icon;

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4 pt-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#35AD29] text-white px-3 py-1 rounded-full text-xs font-bold">
            Goi · משלוח {data.job_number}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-3">
            המשלוח שלך
          </h1>
        </div>

        <Card className="rounded-2xl border-2 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`size-12 rounded-xl grid place-items-center ${st.color}`}
              >
                <StIcon className="size-6" />
              </div>
              <div>
                <Badge className={`${st.color} border-0`}>{st.label}</Badge>
                <div className="font-bold text-lg mt-1">
                  {data.stop_status === "done"
                    ? "החבילה נמסרה!"
                    : data.stop_status === "arrived"
                    ? "השליח כבר אצלך"
                    : data.courier
                    ? "השליח בדרך"
                    : "מחפשים שליח"}
                </div>
              </div>
            </div>

            {data.courier && (
              <div className="rounded-xl bg-slate-50 p-3 flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-[#35AD29] text-white grid place-items-center">
                  <Truck className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{data.courier.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {data.courier.vehicle_type || "שליח"}
                  </div>
                </div>
              </div>
            )}

            {data.stop_status === "pending" &&
              (data.stops_before_me ?? 0) > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-3">
                  ⏱ {data.stops_before_me} מסירות לפניך — נגיע בקרוב
                </div>
              )}

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 mt-0.5 text-slate-400 shrink-0" />
                <span>
                  {data.address}
                  {data.area ? `, ${data.area}` : ""}
                </span>
              </div>
              {data.package_description && (
                <div className="flex items-start gap-2">
                  <Package className="size-4 mt-0.5 text-slate-400 shrink-0" />
                  <span>
                    {data.package_description}
                    {(data.number_of_packages || 0) > 1
                      ? ` (×${data.number_of_packages})`
                      : ""}
                  </span>
                </div>
              )}
              {data.done_at && (
                <div className="text-emerald-700 text-xs">
                  נמסר ב-{new Date(data.done_at).toLocaleTimeString("he-IL")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400">
          הדף מתעדכן אוטומטית כל 15 שניות
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50" dir="rtl">
      <div className="text-center">{children}</div>
    </div>
  );
}
