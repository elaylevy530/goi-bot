import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nestGetJob, nestListJobStops, nestUpdateJobStop } from "@/lib/nest-jobs";
import {
  Package,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { wazeNavigateLlUrl, wazeNavigateUrl } from "@/lib/waze";

export const Route = createFileRoute("/courier/multi-stop/$id")({
  head: () => ({ meta: [{ title: "משלוח מרובה נקודות — Goi" }] }),
  ssr: false,
  component: MultiStopActivePage,
});

function MultiStopActivePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  useMyCourier();

  const { data: job } = useQuery({
    queryKey: ["multi-stop-job", id],
    refetchInterval: 15_000,
    queryFn: () => nestGetJob(id),
  });

  const { data: stops = [] } = useQuery({
    queryKey: ["multi-stop-stops", id],
    refetchInterval: 10_000,
    queryFn: () => nestListJobStops(id),
  });

  const mutate = useMutation({
    mutationFn: (vars: { stopId: string; status: "arrived" | "done" }) =>
      nestUpdateJobStop(id, vars.stopId, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["multi-stop-stops", id] });
      qc.invalidateQueries({ queryKey: ["multi-stop-job", id] });
    },
    onError: (e: any) => toast.error(e?.message || "שגיאה"),
  });

  const completedCount = stops.filter((s: any) => s.status === "done").length;
  const currentIdx = stops.findIndex((s: any) => s.status !== "done");
  const totalCount = stops.length;

  return (
    <CourierShell title={`משלוח ${(job as any)?.job_number ?? ""}`}>
      <div className="max-w-2xl mx-auto space-y-4 pb-24" dir="rtl">
        <Card className="rounded-2xl bg-gradient-to-l from-[#35AD29] to-emerald-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-white/20 text-white border-0">
                מרובה נקודות
              </Badge>
              <div className="text-2xl font-extrabold">
                ₪{(job as any)?.payment ?? 0}
              </div>
            </div>
            <div className="text-sm opacity-90">{(job as any)?.customer_name}</div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span>
                {completedCount}/{totalCount} עצירות הושלמו
              </span>
              {(job as any)?.total_distance_km && (
                <span>{Number((job as any).total_distance_km).toFixed(1)} ק"מ</span>
              )}
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {stops.map((s: any, idx: number) => {
          const isCurrent = idx === currentIdx;
          const isDone = s.status === "done";
          const isArrived = s.status === "arrived";
          const isPickup = s.stop_type === "pickup";
          const nav = s.lat && s.lng
            ? wazeNavigateLlUrl(Number(s.lat), Number(s.lng))
            : s.address
            ? wazeNavigateUrl(String(s.address))
            : null;

          return (
            <Card
              key={s.id}
              className={`rounded-2xl border-2 transition-all ${
                isDone
                  ? "border-slate-200 bg-slate-50 opacity-60"
                  : isCurrent
                  ? isPickup
                    ? "border-amber-400 shadow-lg"
                    : "border-emerald-400 shadow-lg"
                  : "border-slate-200"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-9 rounded-full grid place-items-center text-sm font-extrabold text-white ${
                        isDone
                          ? "bg-slate-400"
                          : isPickup
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="size-5" /> : idx + 1}
                    </span>
                    <div>
                      <div className="font-bold">
                        {isPickup ? "📦 איסוף" : "🎯 מסירה"}
                      </div>
                      {s.contact_name && (
                        <div className="text-xs text-slate-500">{s.contact_name}</div>
                      )}
                    </div>
                  </div>
                  {isArrived && (
                    <Badge className="bg-amber-100 text-amber-800 border-0">
                      הגעת
                    </Badge>
                  )}
                  {isDone && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">
                      הושלם
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="size-4 shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    {s.address}
                    {s.area ? `, ${s.area}` : ""}
                  </span>
                </div>

                {s.package_description && (
                  <div className="flex items-start gap-2 text-sm">
                    <Package className="size-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      {s.package_description}
                      {s.number_of_packages > 1 ? ` (×${s.number_of_packages})` : ""}
                      {s.fragile ? " · ⚠️ שביר" : ""}
                    </span>
                  </div>
                )}

                {!isDone && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {nav && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-1"
                      >
                        <a href={nav} target="_blank" rel="noopener noreferrer">
                          <Navigation className="size-4" />
                          נווט בוויז
                        </a>
                      </Button>
                    )}
                    {s.contact_phone && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-1"
                      >
                        <a href={`tel:${s.contact_phone}`}>
                          <Phone className="size-4" />
                          חיוג
                        </a>
                      </Button>
                    )}
                    {!isArrived && (
                      <Button
                        size="sm"
                        disabled={!isCurrent || mutate.isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                        onClick={() =>
                          mutate.mutate({ stopId: s.id, status: "arrived" })
                        }
                      >
                        {mutate.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="size-4" />
                        )}
                        הגעתי
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={!isCurrent || mutate.isPending}
                      className="bg-primary-deep hover:bg-primary-deep/90 gap-1"
                      onClick={() =>
                        mutate.mutate({ stopId: s.id, status: "done" })
                      }
                    >
                      <CheckCircle2 className="size-4" />
                      {isPickup ? "אספתי" : "מסרתי"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {stops.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-slate-500">
              טוען עצירות…
            </CardContent>
          </Card>
        )}

        {completedCount === totalCount && totalCount > 0 && (
          <Card className="rounded-2xl border-[#35AD29] bg-emerald-50">
            <CardContent className="p-5 text-center">
              <CheckCircle2 className="size-12 text-[#35AD29] mx-auto mb-2" />
              <div className="font-extrabold text-lg">המשלוח הושלם!</div>
              <Button asChild className="mt-3">
                <Link to="/courier/dashboard">חזרה לדאשבורד</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </CourierShell>
  );
}
