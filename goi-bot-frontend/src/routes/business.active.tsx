import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { CourierAvatar } from "@/components/CourierAvatar";
import { nestListJobs, type NestJob } from "@/lib/nest-jobs";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  courierStepLabel,
  courierStepProgress,
  jobCourierAvatar,
  jobCourierName,
  jobCourierVehicle,
  jobEtaMinutes,
  pinsFromJobs,
} from "@/lib/business-panel";
import { MapPin, Package } from "lucide-react";

export const Route = createFileRoute("/business/active")({
  head: () => ({ meta: [{ title: "מעקב חי — Goi" }] }),
  ssr: false,
  component: LiveTrackingPage,
});

function LiveTrackingPage() {
  const { data: me } = useMyBusiness();
  const [stepFilter, setStepFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: jobs = [] } = useQuery({
    queryKey: ["business-live-jobs", me?.id],
    enabled: !!me?.id,
    refetchInterval: 12_000,
    queryFn: () => nestListJobs({ limit: 80 }),
  });

  const active = useMemo(
    () => jobs.filter((j) => ACTIVE_STATUSES.has(j.status) || j.status === "יש שליחים שאישרו"),
    [jobs],
  );
  const visible = useMemo(() => {
    if (stepFilter === "all") return active;
    return active.filter((j) => courierStepLabel(j) === stepFilter);
  }, [active, stepFilter]);
  const pins = useMemo(() => pinsFromJobs(visible), [visible]);
  const steps = useMemo(
    () => Array.from(new Set(active.map((j) => courierStepLabel(j)))),
    [active],
  );
  const highlightId = selectedId && visible.some((j) => j.id === selectedId) ? selectedId : visible[0]?.id;

  return (
    <BusinessShell title="מעקב חי" subtitle={`${active.length} משלוחים פעילים`}>
      <div className="flex flex-col gap-4 p-4 lg:h-[calc(100vh-8.5rem)] lg:gap-6 lg:p-8">
        <div className="hidden items-center gap-3 lg:flex">
          <h2 className="text-xl font-bold text-text-strong">מעקב חי</h2>
          <span className="rounded-pill bg-kpi-volume-bg px-3 py-1 text-xs font-bold text-primary">
            {active.length} משלוחים פעילים
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          <section className="relative min-h-[18rem] flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-panel lg:min-h-0">
            <div className="absolute end-4 top-4 z-10">
              <select
                value={stepFilter}
                onChange={(e) => setStepFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-xs text-text-subtle shadow-kpi"
                aria-label="סנן לפי סטטוס"
              >
                <option value="all">סנן לפי סטטוס</option>
                {steps.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <LiveJobsMap pins={pins} showControls className="h-full min-h-[18rem] lg:min-h-full" />
            {visible.length === 0 && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-muted/50 text-sm text-text-muted">
                אין משלוחים פעילים כרגע
              </div>
            )}
          </section>

          <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[21.25rem]">
            <h2 className="text-base font-bold text-text-strong">משלוחים פעילים בטיפול</h2>
            <div className="flex flex-col gap-3 overflow-y-auto lg:min-h-0 lg:flex-1">
              {visible.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted shadow-panel">
                  <Package className="mx-auto mb-2 size-6" />
                  כשמשלוח יהיה בביצוע — הוא יופיע כאן
                </div>
              ) : (
                visible.map((job) => (
                  <LiveJobCard
                    key={job.id}
                    job={job}
                    selected={job.id === highlightId}
                    onSelect={() => setSelectedId(job.id)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </BusinessShell>
  );
}

function progressTone(label: string) {
  if (label.includes("מסירה") || label === "בטיפול") return "bg-primary";
  if (label.includes("איסוף") && label.startsWith("ב")) return "bg-warning";
  return "bg-success";
}

function LiveJobCard({
  job,
  selected,
  onSelect,
}: {
  job: NestJob;
  selected: boolean;
  onSelect: () => void;
}) {
  const progress = courierStepProgress(job);
  const name = jobCourierName(job);
  const vehicle = jobCourierVehicle(job);
  const label = courierStepLabel(job);
  const eta = jobEtaMinutes(job);

  return (
    <Link
      to="/business/track/$id"
      params={{ id: job.id }}
      onClick={onSelect}
      className={cn(
        "block rounded-xl border bg-surface p-4 shadow-kpi transition hover:shadow-panel",
        selected ? "border-primary" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-bold text-text-strong">{name || "ממתין לשליח"}</div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <span className={cn("rounded-pill px-2 py-0.5 text-[11px] font-bold", statusClass(label))}>
              {label}
            </span>
            <span className="text-xs text-text-muted">{vehicle || "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary">{job.job_number}</span>
          <CourierAvatar path={jobCourierAvatar(job)} name={name} size={28} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-muted">
          <div className={cn("h-full rounded-pill transition-all", progressTone(label))} style={{ width: `${progress}%` }} />
        </div>
        {eta != null && (
          <span className="shrink-0 text-[11px] font-bold text-text-muted">ETA: {eta} דק׳</span>
        )}
      </div>
      {selected && (
        <div className="mt-3 space-y-1.5 text-xs text-text-subtle">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-text-muted" />
            <span className="truncate">{job.pickup_address || job.pickup_area || "—"}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="truncate">{job.dropoff_address || job.dropoff_area || "—"}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

function statusClass(label: string) {
  if (label.includes("מסירה")) return "bg-kpi-volume-bg text-primary";
  if (label.includes("איסוף") && label.startsWith("בדרך")) return "bg-warning-bg text-warning-text";
  return "bg-success-bg text-success-text";
}
