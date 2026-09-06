import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { termsFor } from "@/lib/courier-kind";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  nestAddCourierDecline,
  nestClaimJob,
  nestRemoveCourierDecline,
  nestCourierActiveJobCount,
  nestListCourierDeclines,
  nestListCourierOffers,
  nestListCourierQuotes,
  nestListOpenBroadcastJobs,
  nestListOpenQuoteJobs,
  nestRespondOffer,
} from "@/lib/nest-jobs";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { LIVE_JOB_OFFLINE_ERROR, courierHasLiveActiveJob } from "@/lib/courier-session";
import { nestListConversations } from "@/lib/nest-chat";
import { Bell, ChevronDown, Loader2, MessageCircle, ShoppingBag, MapPin } from "lucide-react";
import { useGpsLiveStatus } from "@/hooks/useCourierGpsTracker";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { COURIER_JOBS_RESTRICTED_MESSAGE, isCourierApproved, isCourierJobsRestricted, isJobSkippedAtCurrentPrice, isLivePendingOffer, isOpenBroadcastJobForCourier, isOpenQuoteJobForCourier, jobMatchesKind, jobOfferPay } from "@/lib/courier-live-jobs";
import { ContactBlock } from "@/routes/courier.history";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierJobsMap, type MapJob } from "@/components/CourierJobsMap";
import { PullToRefresh } from "@/components/courier/PullToRefresh";
import { SwipeConfirm } from "@/components/courier/SwipeConfirm";

export const Route = createFileRoute("/courier/new-jobs")({
  head: () => ({ meta: [{ title: "עבודות חדשות — Goi" }] }),
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: NewJobsPage,
});

function deliveryKindLabel(job: any) {
  const qty = Number(job?.number_of_packages ?? 0);
  const baseType = job?.job_type ?? "משלוח";
  const category = job?.item_category ?? job?.package_type ?? null;
  const label = qty > 0 ? `${qty} × ${baseType}` : baseType;
  return category && category !== baseType ? `${label} · ${category}` : label;
}

function DetailRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex flex-wrap justify-start gap-x-1 ${className ?? ""}`}>
      <b>{label}:</b>
      <span>{value}</span>
    </div>
  );
}

function NewJobsPage() {
  const { data: me } = useMyCourier();
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { jobId: focusJobId } = Route.useSearch();
  const isApproved = isCourierApproved(me);
  const isAvailable = isApproved && me?.accepting_jobs !== false;
  const [detail, setDetail] = useState<any>(null);
  const [quoteFor, setQuoteFor] = useState<any>(null);
  const [activeOffer, setActiveOffer] = useState<MapJob | null>(null);
  const [stickyFocusId, setStickyFocusId] = useState<string | undefined>();

  const { data: declinedRows = [] } = useQuery({
    queryKey: ["courier-job-declines", me?.id],
    enabled: isAvailable,
    queryFn: async () => {
      const rows = await nestListCourierDeclines();
      return rows.map((r) => ({ job_id: r.job_id, declined_price: r.declined_price }));
    },
  });
  const declinedRowsSafe = declinedRows as { job_id: string; declined_price?: string | number | null }[];

  const { data: offers = [], isFetched: offersFetched, isError: offersError, isFetching: offersFetching } = useQuery({
    queryKey: ["new-jobs", me?.id, "pending"],
    enabled: isAvailable,
    refetchInterval: 2_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListCourierOffers("pending");
      const skips = qc.getQueryData<typeof declinedRowsSafe>(["courier-job-declines", me?.id]) ?? [];
      return data
        .filter((offer: any) => {
          const job = offer?.jobs;
          return job ? jobMatchesKind(job, me) : false;
        })
        .filter((offer: any) => isLivePendingOffer(offer, me))
        .filter((offer: any) => {
          const job = Array.isArray(offer?.jobs) ? offer.jobs[0] : offer?.jobs;
          return !isJobSkippedAtCurrentPrice(job ?? { id: offer?.job_id }, skips);
        });
    },
  });

  const { data: quoteJobs = [], isFetched: quotesFetched, isError: quotesError, isFetching: quotesFetching } = useQuery({
    queryKey: ["courier-quote-requests", me?.id],
    enabled: isAvailable,
    refetchInterval: 2_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListOpenQuoteJobs();
      const skips = qc.getQueryData<typeof declinedRowsSafe>(["courier-job-declines", me?.id]) ?? [];
      return data.filter((j: any) => isOpenQuoteJobForCourier(j, me) && !isJobSkippedAtCurrentPrice(j, skips));
    },
  });

  const quoteJobIds = useMemo(() => quoteJobs.map((j: any) => j.id), [quoteJobs]);
  const quoteJobIdsKey = quoteJobIds.join(",");
  const { data: myQuotes = [] } = useQuery({
    queryKey: ["my-quotes-on-open", me?.id, quoteJobIdsKey],
    enabled: isAvailable && quoteJobIds.length > 0,
    queryFn: () => nestListCourierQuotes(quoteJobIds),
  });

  const { data: openJobs = [], isFetched: openFetched, isError: openError, isFetching: openFetching } = useQuery({
    queryKey: ["courier-open-jobs", me?.id],
    enabled: isAvailable,
    refetchInterval: 2_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListOpenBroadcastJobs();
      const skips = qc.getQueryData<typeof declinedRowsSafe>(["courier-job-declines", me?.id]) ?? [];
      return data.filter((j: any) => isOpenBroadcastJobForCourier(j, me) && !isJobSkippedAtCurrentPrice(j, skips));
    },
  });

  useEffect(() => {
    if (!me?.id || !isAvailable) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [me?.id, isAvailable, qc]);

  const quoteByJob = useMemo(() => {
    const map: Record<string, any> = {};
    for (const q of myQuotes) {
      const jobId = String((q as { job_id?: unknown }).job_id ?? "");
      if (jobId) map[jobId] = q;
    }
    return map;
  }, [myQuotes]);

  const respond = useMutation({
    mutationFn: async ({ id, response, jobId }: { id: string; response: "accepted" | "declined"; jobId?: string }) => {
      const data = await nestRespondOffer(id, response);
      if (data?.ok === false) throw new Error(data.reason || "taken");
      if (response === "accepted" && jobId) {
        try {
          const { notifyJobTakenFn } = await import("@/lib/notify-job-taken.functions");
          void notifyJobTakenFn({ data: { jobId } });
        } catch {}
      }
    },
    onSuccess: (_, v) => {
      if (v.response === "declined") return;
      toast.success("קיבלת את העבודה ✓");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["accepted-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (v.jobId) {
        navigate({ to: "/courier/active" });
      }
    },
    onError: (e: Error) => {
      if (e.message === "taken") {
        toast.error(t.jobTaken);
        setDetail(null);
        qc.invalidateQueries({ queryKey: ["new-jobs"] });
        qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      } else if (e.message === "closed") {
        toast.error(t.jobClosed);
      } else {
        toast.error(e.message);
      }
    },
  });

  const claim = useMutation({
    mutationFn: async (jobId: string) => {
      if (!me?.id) throw new Error("no courier");
      const data = await nestClaimJob(jobId, "new-jobs");
      if (data?.ok === false) throw new Error(data.reason || "taken");
      try {
        const { notifyBusinessJobStatusFn } = await import("@/lib/business-status-push.functions");
        void notifyBusinessJobStatusFn({ data: { jobId, status: "assigned" } });
      } catch {}
      try {
        const { notifyCustomerJobStatusFn } = await import("@/lib/customer-status-push.functions");
        void notifyCustomerJobStatusFn({ data: { jobId, status: "assigned" } });
      } catch {}
      try {
        const { notifyJobTakenFn } = await import("@/lib/notify-job-taken.functions");
        void notifyJobTakenFn({ data: { jobId } });
      } catch {}
    },
    onSuccess: (_d, jobId) => {
      toast.success("העבודה נלקחה ✓");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["accepted-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      navigate({ to: "/courier/active" });
    },
    onError: (e: Error) => {
      if (e.message === "taken") {
        toast.error(t.jobTaken);
        setDetail(null);
        qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      } else if (e.message === "closed") {
        toast.error(t.jobClosed);
      } else {
        toast.error(e.message);
      }
    },
  });

  const hideJobLocally = (job: { id: string; suggested_courier_payment?: unknown; payment?: unknown; customer_price?: unknown }) => {
    if (!me?.id || !job.id) return;
    const price = jobOfferPay(job);
    qc.setQueryData(
      ["courier-job-declines", me.id],
      (old: { job_id: string; declined_price?: string | number | null }[] | undefined) => {
        const rows = old ?? [];
        if (rows.some((r) => r.job_id === job.id)) {
          return rows.map((r) => (r.job_id === job.id ? { ...r, declined_price: price } : r));
        }
        return [
          ...rows,
          { id: `local-${job.id}`, courier_id: me.id, job_id: job.id, declined_at: new Date().toISOString(), declined_price: price },
        ];
      },
    );
    qc.setQueryData(["new-jobs", me.id, "pending"], (old: any[] | undefined) =>
      (old ?? []).filter((offer) => {
        const j = Array.isArray(offer?.jobs) ? offer.jobs[0] : offer?.jobs;
        return String(j?.id ?? offer?.job_id ?? "") !== job.id;
      }),
    );
    qc.setQueryData(["courier-open-jobs", me.id], (old: any[] | undefined) =>
      (old ?? []).filter((j) => j.id !== job.id),
    );
    qc.setQueryData(["courier-quote-requests", me.id], (old: any[] | undefined) =>
      (old ?? []).filter((j) => j.id !== job.id),
    );
    setDetail(null);
  };

  const persistSkip = (job: { id: string; offerId?: string }, price: number) => {
    if (!me?.id) return;
    void (async () => {
      try {
        await Promise.all([
          nestAddCourierDecline(job.id, price),
          job.offerId ? nestRespondOffer(job.offerId, "declined") : Promise.resolve(),
        ]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "שגיאה");
        qc.invalidateQueries({ queryKey: ["courier-job-declines", me.id] });
        qc.invalidateQueries({ queryKey: ["new-jobs"] });
        qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
        qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
      }
    })();
  };

  const skipJob = (job: {
    id: string;
    offerId?: string;
    suggested_courier_payment?: unknown;
    payment?: unknown;
    customer_price?: unknown;
  }) => {
    hideJobLocally(job);
    persistSkip({ id: job.id, offerId: job.offerId }, jobOfferPay(job));
    toast(t.jobRemoved, {
      action: {
        label: "בטל דילוג",
        onClick: () => {
          if (!me?.id) return;
          qc.setQueryData(
            ["courier-job-declines", me.id],
            (old: { job_id: string }[] | undefined) => (old ?? []).filter((r) => r.job_id !== job.id),
          );
          void nestRemoveCourierDecline(job.id)
            .then(() => {
              qc.invalidateQueries({ queryKey: ["courier-job-declines", me.id] });
              qc.invalidateQueries({ queryKey: ["new-jobs"] });
              qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
              qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
            })
            .catch((e) => toast.error(e instanceof Error ? e.message : "לא הצלחנו לבטל"));
        },
      },
    });
  };

  const visibleOpenJobs = useMemo(
    () => (openJobs as any[]).filter((j) => !isJobSkippedAtCurrentPrice(j, declinedRowsSafe)),
    [openJobs, declinedRowsSafe],
  );

  const visibleQuoteJobs = useMemo(
    () => (quoteJobs as any[]).filter((j) => {
      if (isJobSkippedAtCurrentPrice(j, declinedRowsSafe)) return false;
      const q = quoteByJob[j.id];
      if (q && !["rejected", "cancelled", "expired"].includes(q.status)) return false;
      return true;
    }),
    [quoteJobs, declinedRowsSafe, quoteByJob],
  );

  const mapJobs: MapJob[] = useMemo(() => {
    // Prefer targeted offers over the same job appearing as an open broadcast.
    // Without this, a dispatched job shows twice: once as offer + once as open.
    const offerJobIds = new Set<string>();
    const out: MapJob[] = [];

    for (const o of offers as any[]) {
      const j = Array.isArray(o?.jobs) ? o.jobs[0] : o?.jobs;
      const jobId = String(j?.id ?? o?.job_id ?? "");
      if (!j || !jobId || offerJobIds.has(jobId)) continue;
      if (isJobSkippedAtCurrentPrice(j, declinedRowsSafe)) continue;
      offerJobIds.add(jobId);
      out.push({ ...j, __kind: "offer", __raw: { offer: o, job: j } });
    }

    for (const j of visibleOpenJobs as any[]) {
      const jobId = String(j?.id ?? "");
      if (!jobId || offerJobIds.has(jobId) || isJobSkippedAtCurrentPrice(j, declinedRowsSafe)) continue;
      out.push({ ...j, __kind: "open", __raw: j });
    }

    for (const j of visibleQuoteJobs as any[]) {
      const jobId = String(j?.id ?? "");
      if (!jobId || offerJobIds.has(jobId)) continue;
      out.push({ ...j, __kind: "quote", __raw: j });
    }

    return out;
  }, [visibleOpenJobs, visibleQuoteJobs, offers, declinedRowsSafe]);

  const openDetails = useCallback((job: MapJob) => {
    if (job.__kind === "offer") {
      const j = job.__raw?.job;
      const offer = job.__raw?.offer;
      setDetail({ ...j, offerId: offer?.id, isQuoteRequest: j?.pricing_type === "quote_request" });
    } else if (job.__kind === "quote") {
      setDetail({ ...job, isQuoteRequest: true, isOpenQuote: true });
    } else {
      setDetail({ ...job });
    }
  }, []);

  useEffect(() => {
    if (!focusJobId) return;
    const job = mapJobs.find((j) => String(j.id) === focusJobId);
    if (job) {
      setStickyFocusId(job.id);
      openDetails(job);
      setActiveOffer(job);
      navigate({ to: "/courier/new-jobs", search: {}, replace: true });
      return;
    }
    if (!isAvailable) return;
    if (offersFetched && quotesFetched && openFetched) {
      toast.error("המשלוח כבר לא זמין");
      navigate({ to: "/courier/new-jobs", search: {}, replace: true });
    }
  }, [focusJobId, mapJobs, isAvailable, offersFetched, quotesFetched, openFetched, navigate, openDetails]);

  const handleClaim = (job: MapJob) => {
    if (job.__kind === "offer") {
      const offerId = job.__raw?.offer?.id;
      if (offerId) respond.mutate({ id: offerId, response: "accepted", jobId: job.id });
      return;
    }
    if (job.__kind === "quote") {
      openDetails(job);
      return;
    }
    claim.mutate(job.id);
  };

  const handleDecline = (job: MapJob) => {
    skipJob({
      id: job.id,
      offerId: job.__kind === "offer" ? job.__raw?.offer?.id : undefined,
      suggested_courier_payment: job.suggested_courier_payment,
      payment: job.payment,
      customer_price: (job as { customer_price?: unknown }).customer_price,
    });
  };

  const handleQuote = (job: MapJob) => {
    setQuoteFor({
      jobId: job.id,
      jobNumber: job.job_number,
      quote: (job as any).existingQuote,
    });
  };

  const { data: activeCount = 0 } = useQuery({
    queryKey: ["courier-active-count", me?.id],
    enabled: !!me?.id,
    refetchInterval: 15_000,
    queryFn: nestCourierActiveJobCount,
  });
  const { data: unreadChat = 0 } = useQuery({
    queryKey: ["courier-chat-unread", me?.id],
    enabled: !!me?.id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const convos = await nestListConversations();
      return convos.reduce((n, c) => n + Number(c.unread_courier ?? 0), 0);
    },
  });

  const availableCount = mapJobs.length;
  const showingOffer = availableCount > 0;
  const jobsError = isAvailable && (offersError || quotesError || openError);
  const jobsLoading =
    isAvailable &&
    !showingOffer &&
    !jobsError &&
    (offersFetching || quotesFetching || openFetching) &&
    !(offersFetched && quotesFetched && openFetched);

  const refreshJobs = useCallback(async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["new-jobs"] }),
      qc.refetchQueries({ queryKey: ["courier-open-jobs"] }),
      qc.refetchQueries({ queryKey: ["courier-quote-requests"] }),
      qc.refetchQueries({ queryKey: ["my-courier-me"] }),
    ]);
  }, [qc]);

  return (
    <CourierShell fullBleed>
      <PullToRefresh
        onRefresh={refreshJobs}
        ignoreSelector=".gm-style"
        className="flex-1 min-h-0 h-full overflow-hidden bg-bg"
      >
      <div dir="rtl" className="relative h-full min-h-0 flex flex-col overflow-hidden">
        {/* Floating chrome only — map fills the viewport underneath */}
        <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
          <div className="pointer-events-auto bg-gradient-to-b from-bg via-bg/70 to-transparent pt-[max(0.5rem,env(safe-area-inset-top))] px-4 pb-3">
            <div className="relative flex min-h-11 items-center">
              <CourierMenuButton className="relative z-10 size-11 shrink-0 rounded-full border border-border/70 bg-surface shadow-[0_6px_18px_rgba(16,24,40,0.12)]" />
              {/* Status control only when available — hide offline capsule */}
              {(isAvailable || showingOffer) && (
                <div className="pointer-events-auto absolute inset-0 grid place-items-center">
                  <AcceptJobsToggle me={me} compact={!showingOffer} mini={showingOffer} />
                </div>
              )}
              <div className="absolute inset-y-0 left-0 z-10 flex items-center">
                <GpsStatusChip />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
            <CourierJobsMap
              jobs={mapJobs}
              focusJobId={stickyFocusId ?? focusJobId}
              onClaim={handleClaim}
              onDecline={handleDecline}
              onQuote={handleQuote}
              onDetails={openDetails}
              onActiveChange={setActiveOffer}
              claiming={claim.isPending || respond.isPending}
              controlsClassName="top-[5.5rem]"
              belowControls={
                showingOffer ? (
                  <button
                    type="button"
                    onClick={() => activeOffer && handleDecline(activeOffer)}
                    disabled={!activeOffer || claim.isPending}
                    className="size-10 rounded-full bg-surface shadow-card border border-border text-xs font-extrabold text-destructive disabled:opacity-50 active:scale-95"
                  >
                    דלג
                  </button>
                ) : undefined
              }
              leftExtra={
                <Link
                  to="/courier/notifications"
                  aria-label="התראות"
                  className="size-11 grid place-items-center rounded-full bg-surface shadow-[0_6px_18px_rgba(16,24,40,0.12)] border border-border/70 text-text-strong active:scale-95"
                >
                  <Bell className="size-4" strokeWidth={2} />
                </Link>
              }
              rightExtra={
                <>
                  <MapFab
                    to="/courier/active"
                    label="פעילים"
                    icon={ShoppingBag}
                    count={Number(activeCount) || 0}
                  />
                  <MapFab
                    to="/courier/messages"
                    label="צ'אט"
                    icon={MessageCircle}
                    count={unreadChat}
                  />
                </>
              }
              emptyState={
                <SearchingCard
                  available={isAvailable}
                  jobWord={t.jobPlural}
                  me={me}
                  loading={jobsLoading}
                  error={jobsError}
                  onRetry={() => { void refreshJobs(); }}
                />
              }
            />
          </div>
      </div>
      </PullToRefresh>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent dir="rtl" className="text-start [&>button]:right-auto [&>button]:left-4 p-0 gap-0 max-w-[min(95vw,400px)]">
          {detail && (
            <>
              {/* Hero section with payment */}
              <div className="relative px-5 pt-6 pb-5 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" aria-hidden />
                <div className="relative">
                  <div className="text-center mb-4">
                    {detail.payment != null && !detail.isQuoteRequest ? (
                      <>
                        <div className="text-5xl font-black leading-none mb-1.5">{Number(detail.payment).toFixed(0)} ₪</div>
                        <div className="text-emerald-100 text-sm font-semibold">תשלום עבור המשלוח</div>
                      </>
                    ) : detail.isQuoteRequest ? (
                      <>
                        <div className="text-4xl font-black leading-none mb-1.5">הצעת מחיר</div>
                        <div className="text-emerald-100 text-sm font-semibold">אתה קובע את המחיר</div>
                      </>
                    ) : (
                      <div className="text-4xl font-black">משלוח #{detail.job_number}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-emerald-100">{detail.pickup_area ?? "איסוף"}</span>
                    <span className="text-white/60">→</span>
                    <span className="text-emerald-100">{detail.dropoff_area ?? "מסירה"}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Timeline */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-1">
                      <div className="size-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                      <div className="absolute top-3 right-[5px] bottom-[-1rem] w-px bg-slate-200" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">איסוף</div>
                      <div className="font-bold text-slate-900 text-[15px] leading-snug">{detail.pickup_address ?? detail.pickup_area ?? "—"}</div>
                      {detail.pickup_notes && (
                        <div className="text-[12px] text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">{detail.pickup_notes}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="size-3 rounded-full bg-rose-500 ring-4 ring-rose-100 mt-1" />
                    <div className="flex-1">
                      <div className="text-[11px] text-slate-500 font-semibold mb-1">מסירה</div>
                      <div className="font-bold text-slate-900 text-[15px] leading-snug">{detail.dropoff_address ?? detail.dropoff_area ?? "—"}</div>
                      {detail.recipient_name && (
                        <div className="text-[13px] text-slate-600 mt-1">נמען: {detail.recipient_name}</div>
                      )}
                      {detail.dropoff_notes && (
                        <div className="text-[12px] text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">{detail.dropoff_notes}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact details */}
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600 pt-2 border-t border-slate-200">
                  <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
                    📦 {deliveryKindLabel(detail)}
                  </span>
                  {detail.job_date && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
                      🕐 {detail.job_date} {detail.job_time}
                    </span>
                  )}
                  {detail.vehicle_required && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
                      🚗 {detail.vehicle_required}
                    </span>
                  )}
                  {detail.customer_name && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 font-medium truncate max-w-full">
                      👤 {detail.customer_name}
                    </span>
                  )}
                </div>

                {detail.description && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-[11px] text-amber-800 font-bold mb-1">הערות נוספות</div>
                    <div className="text-[13px] text-amber-900 leading-relaxed">{detail.description}</div>
                  </div>
                )}
              </div>

              {/* Footer with actions */}
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                {detail.isOpenQuote ? (
                  <>
                    <Button 
                      className="w-full h-12 bg-primary-deep hover:bg-primary-deep/90 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                      onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number, quote: detail.existingQuote }); setDetail(null); }}
                    >
                      {detail.existingQuote ? "עדכן הצעת מחיר" : "הגש הצעת מחיר"}
                    </Button>
                    <div className="flex gap-2">
                      {!detail.existingQuote && (
                        <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold" onClick={() => skipJob(detail)}>דחה</Button>
                      )}
                      <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold" onClick={() => setDetail(null)}>סגור</Button>
                    </div>
                  </>
                ) : detail.offerId ? (
                  <>
                    {detail.isQuoteRequest ? (
                      <Button 
                        className="w-full h-12 bg-primary-deep hover:bg-primary-deep/90 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                        onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number }); setDetail(null); }}
                      >
                        הגש הצעת מחיר
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-12 bg-primary-deep hover:bg-primary-deep/90 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                        onClick={() => respond.mutate({ id: detail.offerId, response: "accepted", jobId: detail.id })} 
                        disabled={respond.isPending}
                      >
                        {respond.isPending && <Loader2 className="size-4 animate-spin" />}
                        {!respond.isPending && "אני לוקח את המשלוח"}
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold" 
                        onClick={() => skipJob(detail)}
                      >
                        דחה
                      </Button>
                      <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold" onClick={() => setDetail(null)}>סגור</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full h-12 bg-primary-deep hover:bg-primary-deep/90 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                      onClick={() => claim.mutate(detail.id)} 
                      disabled={claim.isPending}
                    >
                      {claim.isPending && <Loader2 className="size-4 animate-spin" />}
                      {!claim.isPending && "אני לוקח את המשלוח"}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold" onClick={() => skipJob(detail)}>דחה</Button>
                      <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold" onClick={() => setDetail(null)}>סגור</Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {quoteFor && (
        <SubmitQuoteDialog
          open={!!quoteFor}
          onOpenChange={(o) => !o && setQuoteFor(null)}
          jobId={quoteFor.jobId}
          jobNumber={quoteFor.jobNumber}
          existing={quoteFor.quote}
        />
      )}
    </CourierShell>
  );
}

function MapFab({
  to,
  label,
  icon: Icon,
  count,
}: {
  to: "/courier/active" | "/courier/messages";
  label: string;
  icon: typeof ShoppingBag;
  count: number;
}) {
  return (
    <Link
      to={to}
      className="relative flex size-14 flex-col items-center justify-center rounded-full bg-surface shadow-fab border border-border text-text-strong active:scale-95"
      aria-label={label}
    >
      <Icon className="size-5" strokeWidth={2} />
      <span className="mt-0.5 text-[9px] font-bold leading-none text-text-muted">{label}</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function GpsStatusChip() {
  const gps = useGpsLiveStatus();
  if (!gps.enabled && gps.permission !== "denied") return null;
  const denied = gps.permission === "denied";
  const live = gps.permission === "granted" && !gps.error && gps.lastFixAt != null;
  const label = denied ? "מיקום חסום" : live ? "מיקום פעיל" : "מחפש מיקום";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill bg-surface/95 px-2.5 py-1 text-[10px] font-extrabold shadow-card ${
        denied ? "text-destructive" : live ? "text-primary" : "text-text-muted"
      }`}
    >
      <MapPin className="size-3" aria-hidden />
      {label}
    </span>
  );
}

function SearchingCard({
  available,
  jobWord,
  me,
  loading = false,
  error = false,
  onRetry,
}: {
  available: boolean;
  jobWord: string;
  me?: any;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const qc = useQueryClient();
  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const restricted = isCourierJobsRestricted(me);

  const goOnline = useMutation({
    mutationFn: async () => {
      let courier = me;
      if (!courier) {
        const { nestMyCourier, getNestAccessToken } = await import("@/lib/nest-auth");
        if (!getNestAccessToken()) throw new Error("יש להתחבר מחדש");
        courier = await nestMyCourier();
      }
      const canGoOnline = courier?.courier_status === "פעיל" && courier?.is_paused !== true;
      if (!courier || !canGoOnline) {
        throw new Error(
          isCourierJobsRestricted(courier)
            ? COURIER_JOBS_RESTRICTED_MESSAGE
            : "החשבון ממתין לאישור",
        );
      }
      const { goCourierOnlineWithGps } = await import("@/lib/courier-location");
      await goCourierOnlineWithGps();
      void (async () => {
        try {
          const { enablePushForCourier, pushSupported } = await import("@/lib/push/subscribe");
          if (pushSupported() && courier.id) {
            const res = await enablePushForCourier(courier.id);
            if (!res.ok && res.reason === "denied") {
              toast.error("התראות חסומות — הפעל בהגדרות הדפדפן כדי לקבל הצעות");
            }
          }
        } catch {}
      })();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!available) {
    return (
      <div
        dir="rtl"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative mx-auto w-full max-w-lg pt-[9.5rem] lg:max-w-3xl">
          <div className="pointer-events-auto relative rounded-full bg-white p-[10px] shadow-[0_12px_30px_rgba(16,24,40,0.16)]">
            {/* The mascot's torso ends at 94% of the PNG; the finger fills the rest.
                Offset so the torso lands on the frame edge and only the finger passes it. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[calc(100%-12px)] z-[-1] flex justify-center"
              aria-hidden
            >
              <img
                src="/courier/goi-offline-mascot.png?v=9"
                alt=""
                draggable={false}
                className="h-[150px] w-auto max-w-none select-none [animation:mascot-enter_0.4s_ease-out_both]"
              />
            </div>

            <SwipeConfirm
              variant="availability"
              label="החלק כדי להפוך לזמין"
              subtitle={restricted ? COURIER_JOBS_RESTRICTED_MESSAGE : "והתחל לקבל משלוחים"}
              disabled={goOnline.isPending || (me != null && !approved)}
              onConfirm={() => {
                if (goOnline.isPending || (me != null && !approved)) return;
                goOnline.mutate();
              }}
            />

            {/* Same frame, clipped to the finger alone, drawn over the frame */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[calc(100%-12px)] z-[2] flex justify-center"
              aria-hidden
            >
              <img
                src="/courier/goi-offline-mascot.png?v=9"
                alt=""
                draggable={false}
                className="h-[150px] w-auto max-w-none select-none [animation:mascot-enter_0.4s_ease-out_both] [clip-path:inset(92%_80.5%_0_13%)]"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto w-full max-w-lg lg:max-w-3xl">
        <div className="relative flex min-h-[84px] items-center gap-3 overflow-hidden rounded-[1.6rem] border border-[#BFE3B9] bg-[linear-gradient(105deg,rgba(255,255,255,0.98)_0%,rgba(246,252,245,0.98)_42%,rgba(232,248,228,0.98)_100%)] px-5 py-3 shadow-[0_10px_28px_rgba(16,24,40,0.13),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(53,173,41,0.08)] backdrop-blur-md">
          <span
            className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_center,rgba(53,173,41,0.12),transparent_68%)]"
            aria-hidden
          />
          <div className="relative size-[58px] shrink-0" aria-hidden>
            <span className="absolute inset-0 rounded-full border border-[#35AD29]/25" />
            <span className="absolute inset-[18%] rounded-full border border-[#35AD29]/35" />
            <span className="absolute inset-[36%] rounded-full border border-[#35AD29]/45" />
            <span className="absolute inset-0 animate-[spin_2.8s_linear_infinite]">
              <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#35AD29] shadow-[0_0_0_3px_rgba(53,173,41,0.12)]" />
            </span>
            <span className="absolute bottom-[10%] right-[4%] size-2 rounded-full bg-[#35AD29]/75" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="text-[16px] font-extrabold leading-snug text-[#111]">
              {restricted
                ? "אין משלוחים זמינים עכשיו"
                : error
                  ? "לא הצלחנו לטעון משלוחים"
                  : loading
                    ? "טוען משלוחים…"
                    : "מחפש משלוחים באזור שלך"}
            </div>
            <div className="mt-1 text-[12px] leading-snug text-[#6B6B6B]">
              {restricted
                ? COURIER_JOBS_RESTRICTED_MESSAGE
                : error
                  ? "בדקו את הרשת ונסו שוב"
                  : "משלוח מתאים יקפוץ אוטומטית על המפה"}
            </div>
            {error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="pointer-events-auto mt-2 text-[12px] font-extrabold text-primary"
              >
                נסה שוב
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AcceptJobsToggle({
  me,
  compact = false,
  mini = false,
}: {
  me: any;
  compact?: boolean;
  mini?: boolean;
}) {
  const qc = useQueryClient();
  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const liveJobLocksOffline = courierHasLiveActiveJob(me);
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    if (!me) return;
    setOn(approved && me.accepting_jobs !== false);
  }, [me, approved]);

  const requestPermissionsOnce = async () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
          );
        });
      } catch {}
    }
    try {
      const { enablePushForCourier, pushSupported } = await import("@/lib/push/subscribe");
      if (pushSupported() && me?.id) {
        const res = await enablePushForCourier(me.id);
        if (!res.ok && res.reason === "denied") {
          toast.error("התראות חסומות — הפעל בהגדרות הדפדפן כדי לקבל הצעות");
        }
      }
    } catch {}
  };

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (!me) return;
      if (!next && liveJobLocksOffline) {
        throw new Error(LIVE_JOB_OFFLINE_ERROR);
      }
      if (next) {
        const { goCourierOnlineWithGps } = await import("@/lib/courier-location");
        await goCourierOnlineWithGps();
        await requestPermissionsOnce();
        return;
      }
      await nestUpdateMyCourier({ accepting_jobs: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setOn((v) => !v);
    },
  });

  if (!me) return null;

  const title = !approved
    ? "סטטוס - לא פעיל"
    : on
      ? mini
        ? "פעיל"
        : "פעיל לקבלת עבודות"
      : mini
        ? "כבוי"
        : "סטטוס - לא פעיל";
  const subtitle = !approved
    ? "החשבון ממתין לאישור או מושהה"
    : liveJobLocksOffline && on
      ? "יש משלוח פעיל — לא ניתן לעבור למצב לא זמין"
    : on
      ? "תקבלו משלוחים והתראות"
      : "הפעילו כדי לקבל משלוחים והתראות";

  const flip = () => {
    if (!approved || toggle.isPending) return;
    if (on && liveJobLocksOffline) {
      toast.error(LIVE_JOB_OFFLINE_ERROR);
      return;
    }
    const next = !on;
    setOn(next);
    toggle.mutate(next);
  };

  if (mini) {
    return (
      <button
        type="button"
        onClick={flip}
        disabled={!approved || toggle.isPending || (on && liveJobLocksOffline)}
        aria-label={title}
        className={`flex items-center gap-1.5 rounded-pill bg-surface px-3.5 py-2 shadow-card ${
          !approved ? "opacity-70" : ""
        }`}
      >
        {on && approved && <span className="size-2 rounded-full bg-primary shrink-0" aria-hidden />}
        <span className="text-sm font-bold text-text-strong">{title}</span>
        <ChevronDown className="size-3.5 text-text-muted" aria-hidden />
      </button>
    );
  }

  // Offline: no top capsule — go-online happens via bottom slide only
  if (compact && !on) return null;

  return (
    <div
      className={`bg-surface shadow-card flex items-center justify-between gap-3 ${
        compact ? "w-auto max-w-[min(100%,20rem)] rounded-pill px-3.5 py-2" : "w-full rounded-[20px] p-5 gap-4"
      } ${!approved ? "opacity-70" : ""}`}
    >
      <Switch
        checked={on}
        disabled={!approved || toggle.isPending || (on && liveJobLocksOffline)}
        onCheckedChange={(next) => {
          if (!approved) return;
          if (!next && liveJobLocksOffline) {
            toast.error(LIVE_JOB_OFFLINE_ERROR);
            return;
          }
          setOn(next);
          toggle.mutate(next);
        }}
        aria-label={title}
        className={`shrink-0 overflow-hidden data-[state=checked]:bg-primary-deep ${
          compact
            ? "h-7 w-12 [&>span]:size-5 data-[state=checked]:[&>span]:translate-x-5"
            : "h-8 w-[3.25rem] [&>span]:size-6 data-[state=checked]:[&>span]:translate-x-[1.35rem]"
        }`}
      />
      <div className="min-w-0 flex-1 text-right flex items-center justify-end gap-2">
        {compact && on && approved && (
          <span className="size-2 rounded-full bg-primary shrink-0" aria-hidden />
        )}
        <div className="min-w-0">
          <div className={`font-bold text-text-strong leading-tight truncate ${compact ? "text-sm" : "text-base"}`}>
            {title}
          </div>
          {!compact && (
            <div className="text-[13px] text-text-subtle mt-0.5 leading-snug">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
