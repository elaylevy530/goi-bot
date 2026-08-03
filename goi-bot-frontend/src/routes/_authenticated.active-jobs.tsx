import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { ActiveJobOpsMap } from "@/components/admin/ActiveJobOpsMap";
import { MatchCouriersDialog } from "@/components/MatchCouriersDialog";
import { JobStatusBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isActiveJobStatus,
  jobDropoffLatLng,
  jobPickupLatLng,
  minutesAgoLabel,
  nearbyCouriersFrom,
  sortActiveJobs,
  waitingMinutes,
} from "@/lib/active-jobs";
import type { JobStatus } from "@/lib/constants";
import { nestListCouriers } from "@/lib/nest-accounts";
import { nestCancelJob, nestListJobs, type NestJob } from "@/lib/nest-jobs";
import {
  Activity,
  Bike,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/active-jobs")({
  head: () => ({ meta: [{ title: "משלוחים פעילים — Goi" }] }),
  component: ActiveJobsPage,
});

function ActiveJobsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const jobsQuery = useQuery({
    queryKey: ["active-jobs-ops"],
    queryFn: () => nestListJobs({ limit: 500 }),
    refetchInterval: 12_000,
  });

  const couriersQuery = useQuery({
    queryKey: ["active-jobs-ops-couriers"],
    queryFn: () => nestListCouriers({ status: "פעיל", limit: 1000 }),
    refetchInterval: 20_000,
  });

  const activeJobs = useMemo(() => {
    const rows = (jobsQuery.data ?? []).filter((j) => isActiveJobStatus(j.status));
    return sortActiveJobs(rows);
  }, [jobsQuery.data]);

  useEffect(() => {
    if (!activeJobs.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && activeJobs.some((j) => j.id === selectedId)) return;
    setSelectedId(activeJobs[0].id);
  }, [activeJobs, selectedId]);

  const selected = useMemo(
    () => activeJobs.find((j) => j.id === selectedId) ?? null,
    [activeJobs, selectedId],
  );

  const courierById = useMemo(() => {
    const map = new Map<string, { full_name?: string | null; whatsapp_phone?: string | null }>();
    for (const c of couriersQuery.data ?? []) map.set(c.id, c);
    return map;
  }, [couriersQuery.data]);

  const pickup = selected ? jobPickupLatLng(selected) : null;
  const dropoff = selected ? jobDropoffLatLng(selected) : null;
  const nearby = useMemo(
    () => nearbyCouriersFrom(couriersQuery.data ?? [], pickup, 15, 30),
    [couriersQuery.data, pickup],
  );

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("לא נבחר משלוח");
      return nestCancelJob(selected.id, cancelReason);
    },
    onSuccess: () => {
      toast.success("המשלוח בוטל");
      setCancelOpen(false);
      setCancelReason("");
      qc.invalidateQueries({ queryKey: ["active-jobs-ops"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => toast.error(e.message || "ביטול נכשל"),
  });

  const unassignedCount = activeJobs.filter((j) => !j.selected_courier_id).length;
  const refreshing = jobsQuery.isFetching || couriersQuery.isFetching;

  return (
    <AdminLayout
      title="משלוחים פעילים"
      subtitle={`${activeJobs.length} פעילים · ${unassignedCount} בלי שליח`}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={refreshing}
          onClick={() => {
            void jobsQuery.refetch();
            void couriersQuery.refetch();
          }}
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          רענן
        </Button>
      }
    >
      <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
        {/* List */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              תור פעיל
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[72vh] overflow-y-auto divide-y">
              {jobsQuery.isLoading && (
                <div className="p-8 text-center text-sm text-muted-foreground">טוען...</div>
              )}
              {!jobsQuery.isLoading && activeJobs.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  אין משלוחים פעילים כרגע
                </div>
              )}
              {activeJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  selected={job.id === selectedId}
                  courierName={
                    job.selected_courier_id
                      ? courierById.get(job.selected_courier_id)?.full_name ?? "שליח משובץ"
                      : null
                  }
                  onSelect={() => setSelectedId(job.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detail + map */}
        <div className="space-y-4 min-w-0">
          {!selected ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                בחר משלוח מהרשימה
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-right min-w-0">
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="font-mono font-bold text-lg">#{selected.job_number}</span>
                        <JobStatusBadge
                          status={selected.status as JobStatus}
                          courierStep={(selected as any).courier_step}
                        />
                        {!selected.selected_courier_id && (
                          <Badge variant="destructive" className="text-[10px]">בלי שליח</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selected.customer_name || (selected as any).guest_name || "מזמין"}
                        {" · "}
                        {waitingMinutes(selected.created_at)} דק׳ ממתינים
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <MatchCouriersDialog
                        jobId={selected.id}
                        jobNumber={String(selected.job_number)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCancelOpen(true)}
                      >
                        <XCircle className="size-4" /> ביטול
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <AddressBlock
                      tone="pickup"
                      label="איסוף"
                      address={[selected.pickup_address, selected.pickup_area].filter(Boolean).join(", ")}
                    />
                    <AddressBlock
                      tone="dropoff"
                      label="מסירה"
                      address={[selected.dropoff_address, selected.dropoff_area].filter(Boolean).join(", ")}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <MetaChip icon={Clock} label={selected.job_time ?? selected.job_date ?? "מיידי"} />
                    <MetaChip
                      icon={Activity}
                      label={`${Number(selected.payment ?? 0).toFixed(0)} ₪`}
                    />
                    {selected.job_type && <MetaChip icon={MapPin} label={selected.job_type} />}
                    {selected.selected_courier_id && (
                      <MetaChip
                        icon={UserRound}
                        label={courierById.get(selected.selected_courier_id)?.full_name ?? "שליח משובץ"}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="size-4" />
                      מפה · שליחים באזור
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ActiveJobOpsMap
                      pickup={pickup}
                      dropoff={dropoff}
                      couriers={nearby}
                      className="w-full h-[420px]"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bike className="size-4" />
                      קרובים ({nearby.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                    {!pickup && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        אין קואורדינטות איסוף — מציג שליחים פעילים לפי GPS בלבד כשיהיו נתונים.
                      </p>
                    )}
                    {pickup && nearby.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        אין שליחים פעילים עם GPS ב־15 ק״מ האחרונים
                      </p>
                    )}
                    {nearby.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">{c.full_name}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {pickup ? `${c.distanceKm} ק״מ` : "—"}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap justify-end">
                          {c.vehicle_type && <span>{c.vehicle_type}</span>}
                          <span>{minutesAgoLabel(c.last_location_at)}</span>
                          {c.whatsapp_phone && (
                            <a
                              href={`https://wa.me/${String(c.whatsapp_phone).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-green-700 hover:underline"
                            >
                              <Phone className="size-3" />
                              וואטסאפ
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ביטול משלוח #{selected?.job_number}</DialogTitle>
            <DialogDescription>
              המשלוח יסומן כבוטל, והצעות ממתינות לשליחים ייסגרו. פעולה זו לא ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">סיבת ביטול</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="למשל: ביטול מצד הלקוח"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              חזרה
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              {cancelMut.isPending ? "מבטל..." : "אשר ביטול"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function JobRow({
  job,
  selected,
  courierName,
  onSelect,
}: {
  job: NestJob;
  selected: boolean;
  courierName: string | null;
  onSelect: () => void;
}) {
  const wait = waitingMinutes(job.created_at);
  const urgent = !job.selected_courier_id && wait >= 10;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-right px-3 py-3 transition ${
        selected ? "bg-primary/8 border-r-2 border-r-primary" : "hover:bg-muted/40"
      } ${urgent ? "bg-amber-50/70" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-bold text-sm">#{job.job_number}</span>
        <JobStatusBadge status={job.status as JobStatus} courierStep={(job as any).courier_step} />
      </div>
      <div className="mt-1 text-[12px] font-medium truncate">
        {[job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "איסוף —"}
      </div>
      <div className="text-[11px] text-muted-foreground truncate">
        ← {[job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "מסירה —"}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{courierName ?? "ממתין לשליח"}</span>
        <span className={urgent ? "text-amber-700 font-semibold" : ""}>{wait} דק׳</span>
      </div>
    </button>
  );
}

function AddressBlock({
  label,
  address,
  tone,
}: {
  label: string;
  address: string;
  tone: "pickup" | "dropoff";
}) {
  const color = tone === "pickup" ? "bg-[#1e6cf2]" : "bg-[#35AD29]";
  return (
    <div className="rounded-xl border bg-muted/20 p-3 text-right">
      <div className="flex items-center gap-1.5 justify-end text-[11px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className={`size-2 rounded-full ${color}`} />
      </div>
      <div className="font-semibold text-sm leading-snug break-words">{address || "—"}</div>
    </div>
  );
}

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: typeof Clock;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2.5 py-1 font-medium">
      <Icon className="size-3" />
      {label}
    </span>
  );
}
