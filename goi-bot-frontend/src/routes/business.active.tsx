import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { nestListJobs, type NestJob } from "@/lib/nest-jobs";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  courierStepLabel,
  courierStepProgress,
  jobCourierName,
  jobCourierVehicle,
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
  const pins = useMemo(() => pinsFromJobs(active), [active]);

  return (
    <BusinessShell title="מעקב חי" subtitle={`${active.length} משלוחים פעילים`}>
      <div className="flex flex-col gap-4 p-4 lg:h-[calc(100vh-8.5rem)] lg:flex-row lg:gap-6 lg:p-8">
        <section className="relative min-h-[18rem] flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:min-h-0">
          <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
            <span className="rounded-pill bg-success-bg px-3 py-1 text-xs font-bold text-success-text">
              {active.length} משלוחים פעילים
            </span>
          </div>
          <LiveJobsMap pins={pins} className="h-full min-h-[18rem] lg:min-h-full" />
          {active.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-muted/50 text-sm text-text-muted">
              אין משלוחים פעילים כרגע
            </div>
          )}
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[21.25rem]">
          <h2 className="text-base font-bold text-text-strong">משלוחים פעילים בטיפול</h2>
          <div className="flex flex-col gap-3 overflow-y-auto lg:min-h-0 lg:flex-1">
            {active.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted shadow-card">
                <Package className="mx-auto mb-2 size-6" />
                כשמשלוח יהיה בביצוע — הוא יופיע כאן
              </div>
            ) : (
              active.map((job) => <LiveJobCard key={job.id} job={job} />)
            )}
          </div>
        </aside>
      </div>
    </BusinessShell>
  );
}

function LiveJobCard({ job }: { job: NestJob }) {
  const progress = courierStepProgress(job);
  const name = jobCourierName(job);
  const vehicle = jobCourierVehicle(job);

  return (
    <Link
      to="/business/track/$id"
      params={{ id: job.id }}
      className="block rounded-xl border border-border bg-surface p-4 shadow-card transition hover:shadow-card-strong"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-bold text-text-strong">{name || "ממתין לשליח"}</div>
          <div className="text-xs text-text-muted">{vehicle || "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-text-muted">{job.job_number}</span>
          <span className="grid size-6 place-items-center rounded-full bg-kpi-volume-bg text-[10px] font-bold text-info-text">
            {(name || "?").slice(0, 1)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-pill bg-kpi-volume-bg px-2 py-0.5 text-[11px] font-bold text-info-text">
          {courierStepLabel(job)}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-muted">
        <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-text-subtle">
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-text-muted" />
          <span className="truncate">{job.pickup_address || job.pickup_area || "—"}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className={cn("mt-0.5 size-3.5 shrink-0 text-primary")} />
          <span className="truncate">{job.dropoff_address || job.dropoff_area || "—"}</span>
        </div>
      </div>
    </Link>
  );
}
