import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCourierTerms } from "@/lib/courier-kind";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { ActiveJobs } from "@/routes/courier.history";
import { PullToRefresh } from "@/components/courier/PullToRefresh";
import { nestListCourierActiveJobs } from "@/lib/nest-jobs";

export const Route = createFileRoute("/courier/active")({
  head: () => ({ meta: [{ title: "משלוחים פעילים — Goi" }] }),
  component: ActivePage,
});

function ActivePage() {
  const t = useCourierTerms();
  const qc = useQueryClient();
  const { data: me } = useMyCourier();
  const { data: jobs = [] } = useQuery({
    queryKey: ["active-jobs", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListCourierActiveJobs(),
  });
  const n = jobs.length;
  const subtitle = n <= 0
    ? t.activeJobsSub
    : n === 1
      ? (t.kind === "mover" ? "1 הובלה פעילה כרגע" : "1 משלוח פעיל כרגע")
      : (t.kind === "mover" ? `${n} הובלות פעילות כרגע` : `${n} משלוחים פעילים כרגע`);
  const refresh = useCallback(async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["active-jobs"] }),
      qc.refetchQueries({ queryKey: ["courier-active-count"] }),
      qc.refetchQueries({ queryKey: ["my-courier-me"] }),
    ]);
  }, [qc]);

  return (
    <CourierShell title={t.activeJobs} subtitle={subtitle}>
      <PullToRefresh onRefresh={refresh}>
        <ActiveJobs />
      </PullToRefresh>
    </CourierShell>
  );
}
