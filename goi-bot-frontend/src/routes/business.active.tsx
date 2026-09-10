import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BusinessShell, useBusinessJobs, useMyBusiness } from "@/components/BusinessShell";
import { ActiveTracking } from "@/components/business/goi/ActiveTracking";
import { isTrackingJob, type LiveMapPin } from "@/lib/business-panel";

export const Route = createFileRoute("/business/active")({
  head: () => ({ meta: [{ title: "מעקב משלוחים פעילים — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    job: typeof s.job === "string" ? s.job : undefined,
    filter: typeof s.filter === "string" ? s.filter : undefined,
  }),
  component: LiveTrackingPage,
});

function LiveTrackingPage() {
  const { job, filter } = Route.useSearch();
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const { data: jobs = [] } = useBusinessJobs(me?.id);
  const [selectedId, setSelectedId] = useState<string | undefined>(job);

  const active = useMemo(() => jobs.filter(isTrackingJob), [jobs]);
  const pickupLat = Number((me as { pickup_lat?: number | null } | null)?.pickup_lat);
  const pickupLng = Number((me as { pickup_lng?: number | null } | null)?.pickup_lng);
  const storePin: LiveMapPin | null =
    Number.isFinite(pickupLat) && Number.isFinite(pickupLng)
      ? { id: "store", lat: pickupLat, lng: pickupLng, label: (me as { business_name?: string } | null)?.business_name || "העסק", type: "store", color: "#00a334" }
      : null;

  return (
    <BusinessShell>
      <ActiveTracking
        jobs={active}
        businessName={(me as { business_name?: string; name?: string } | null)?.business_name || me?.name || "העסק"}
        storePin={storePin}
        selectedId={selectedId || job}
        initialFilter={filter || "all"}
        onSelect={setSelectedId}
        onDetails={(id) => navigate({ to: "/business/order/$id", params: { id } })}
      />
    </BusinessShell>
  );
}
