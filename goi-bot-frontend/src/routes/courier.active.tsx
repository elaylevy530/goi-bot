import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCourierTerms } from "@/lib/courier-kind";
import { CourierShell } from "@/components/CourierShell";
import { ActiveJobs } from "@/routes/courier.history";
import { PullToRefresh } from "@/components/courier/PullToRefresh";

export const Route = createFileRoute("/courier/active")({
  head: () => ({ meta: [{ title: "משלוחים פעילים — Goi" }] }),
  component: ActivePage,
});

function ActivePage() {
  const t = useCourierTerms();
  const qc = useQueryClient();
  const refresh = useCallback(async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["active-jobs"] }),
      qc.refetchQueries({ queryKey: ["courier-active-count"] }),
      qc.refetchQueries({ queryKey: ["my-courier-me"] }),
    ]);
  }, [qc]);

  return (
    <CourierShell title={t.activeJobs} subtitle={t.activeJobsSub}>
      <PullToRefresh onRefresh={refresh}>
        <ActiveJobs />
      </PullToRefresh>
    </CourierShell>
  );
}
