import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MapPin, Navigation, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/track/$token")({
  head: () => ({ meta: [{ title: "מעקב משלוח — Goi" }] }),
  ssr: false,
  component: PublicTrackPage,
});

type TrackData = {
  job_number: string;
  job_type: string;
  status: string;
  pickup_area?: string;
  dropoff_area?: string;
  pickup_address?: string;
  dropoff_address?: string;
  recipient_name?: string;
  courier?: { full_name: string; whatsapp_phone?: string; vehicle_type?: string; last_lat?: number; last_lng?: number; last_location_at?: string };
} | null;

function PublicTrackPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [data, setData] = useState<TrackData>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/track/${encodeURIComponent(token)}`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? "המשלוח לא נמצא" : "שגיאה");
          return;
        }
        const j = await res.json();
        if (cancelled) return;
        setData(j as TrackData);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה");
      }
    };
    load();
    const t = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [token]);


  if (error) return <Centered>{error}</Centered>;
  if (!data) return <Centered>טוען…</Centered>;

  const c = data.courier;
  const mapsUrl = c?.last_lat && c?.last_lng
    ? `https://www.google.com/maps?q=${c.last_lat},${c.last_lng}&z=15&output=embed`
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        <button
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowRight className="size-4" /> חזרה
        </button>
        <div className="text-center">
          <img src="/goi-logo.png" alt="GOi" className="h-10 mx-auto mb-2" />
          <h1 className="text-xl font-extrabold text-slate-900">מעקב משלוח {data.job_number}</h1>
          <div className="mt-1 inline-block text-xs font-semibold bg-emerald-50 text-[#35AD29] rounded-full px-3 py-1">{data.status}</div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {mapsUrl ? (
              <div className="aspect-[16/12] bg-slate-100">
                <iframe title="מפה" src={mapsUrl} className="w-full h-full border-0" loading="lazy" />
              </div>
            ) : (
              <div className="aspect-[16/12] bg-slate-100 grid place-items-center text-slate-400 text-sm text-center p-6">
                <div>
                  <Navigation className="size-8 mx-auto mb-2 opacity-40" />
                  {c ? "השליח עדיין לא שיתף מיקום" : "טרם נבחר שליח"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {c && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs text-slate-500 mb-1">השליח שלך</div>
              <div className="font-bold text-lg text-slate-900">{c.full_name}</div>
              {c.vehicle_type && <div className="text-sm text-slate-500">{c.vehicle_type}</div>}
              {c.whatsapp_phone && (
                <>
                  <div dir="ltr" className="text-sm text-slate-700 mt-2 font-mono">{c.whatsapp_phone}</div>
                  <a href={`tel:${c.whatsapp_phone}`} className="mt-3 flex items-center justify-center gap-2 bg-primary-deep text-white rounded-xl py-3 font-bold">
                    <Phone className="size-4" /> חייג לשליח
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="flex items-start gap-2"><MapPin className="size-4 text-emerald-600 mt-0.5" /><div><div className="text-xs text-slate-500">איסוף</div><div className="font-semibold">{data.pickup_address || data.pickup_area || "—"}</div></div></div>
            <div className="flex items-start gap-2"><MapPin className="size-4 text-rose-500 mt-0.5" /><div><div className="text-xs text-slate-500">מסירה</div><div className="font-semibold">{data.dropoff_address || data.dropoff_area || "—"}</div></div></div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400">מערכת Goi · מעקב חי</div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: any }) {
  return <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">{children}</div>;
}
