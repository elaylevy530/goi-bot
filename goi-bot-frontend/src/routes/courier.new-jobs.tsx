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
  nestCourierActiveJobCount,
  nestListCourierDeclines,
  nestListCourierOffers,
  nestListCourierQuotes,
  nestListOpenBroadcastJobs,
  nestListOpenQuoteJobs,
  nestRespondOffer,
} from "@/lib/nest-jobs";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { nestListConversations } from "@/lib/nest-chat";
import { Bell, ChevronDown, Loader2, MessageCircle, ShoppingBag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { isCourierApproved, isLivePendingOffer, isOpenBroadcastJobForCourier, isOpenQuoteJobForCourier, jobMatchesKind } from "@/lib/courier-live-jobs";
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

  const { data: declinedRows = [] } = useQuery({
    queryKey: ["courier-job-declines", me?.id],
    enabled: isAvailable,
    queryFn: async () => {
      const rows = await nestListCourierDeclines();
      return rows.map((r) => ({ job_id: r.job_id }));
    },
  });
  const declinedSet = useMemo(() => new Set(declinedRows.map((r: any) => r.job_id)), [declinedRows]);

  const { data: offers = [] } = useQuery({
    queryKey: ["new-jobs", me?.id, "pending"],
    enabled: isAvailable,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListCourierOffers("pending");
      return data
        .filter((offer: any) => {
          const job = offer?.jobs;
          return job ? jobMatchesKind(job, me) : false;
        })
        .filter((offer: any) => isLivePendingOffer(offer, me));
    },
  });

  const { data: quoteJobs = [] } = useQuery({
    queryKey: ["courier-quote-requests", me?.id],
    enabled: isAvailable,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListOpenQuoteJobs();
      return data.filter((j: any) => isOpenQuoteJobForCourier(j, me));
    },
  });

  const quoteJobIds = useMemo(() => quoteJobs.map((j: any) => j.id), [quoteJobs]);
  const quoteJobIdsKey = quoteJobIds.join(",");
  const { data: myQuotes = [] } = useQuery({
    queryKey: ["my-quotes-on-open", me?.id, quoteJobIdsKey],
    enabled: isAvailable && quoteJobIds.length > 0,
    queryFn: () => nestListCourierQuotes(quoteJobIds),
  });

  const { data: openJobs = [] } = useQuery({
    queryKey: ["courier-open-jobs", me?.id],
    enabled: isAvailable,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListOpenBroadcastJobs();
      return data.filter((j: any) => isOpenBroadcastJobForCourier(j, me));
    },
  });

  useEffect(() => {
    if (!me?.id || !isAvailable) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
    }, 20_000);
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

  useEffect(() => {
    if (!focusJobId) return;
    navigate({ to: "/courier/new-jobs", search: {}, replace: true });
  }, [focusJobId, navigate]);

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
      toast.success(v.response === "accepted" ? "קיבלת את העבודה ✓" : "ההצעה נדחתה");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["accepted-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      if (v.response === "accepted" && v.jobId) {
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

  const persistDecline = async (jobId: string) => {
    if (!me?.id) return false;
    try {
      await nestAddCourierDecline(jobId);
      qc.invalidateQueries({ queryKey: ["courier-job-declines", me.id] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
      return false;
    }
  };

  const declineOpenJob = async (jobId: string) => {
    const ok = await persistDecline(jobId);
    if (!ok) return;
    setDetail(null);
    toast(t.jobRemoved);
  };

  const declineQuoteJob = async (jobId: string) => {
    const ok = await persistDecline(jobId);
    if (!ok) return;
    setDetail(null);
    toast("הבקשה הוסרה מהרשימה שלך");
  };

  const visibleOpenJobs = useMemo(
    () => (openJobs as any[]).filter((j) => !declinedSet.has(j.id)),
    [openJobs, declinedSet],
  );

  const visibleQuoteJobs = useMemo(
    () => (quoteJobs as any[]).filter((j) => {
      if (declinedSet.has(j.id)) return false;
      const q = quoteByJob[j.id];
      if (q && !["rejected", "cancelled", "expired"].includes(q.status)) return false;
      return true;
    }),
    [quoteJobs, declinedSet, quoteByJob],
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
      offerJobIds.add(jobId);
      out.push({ ...j, __kind: "offer", __raw: { offer: o, job: j } });
    }

    for (const j of visibleOpenJobs as any[]) {
      const jobId = String(j?.id ?? "");
      if (!jobId || offerJobIds.has(jobId) || declinedSet.has(jobId)) continue;
      out.push({ ...j, __kind: "open", __raw: j });
    }

    for (const j of visibleQuoteJobs as any[]) {
      const jobId = String(j?.id ?? "");
      if (!jobId || offerJobIds.has(jobId)) continue;
      out.push({ ...j, __kind: "quote", __raw: j });
    }

    return out;
  }, [visibleOpenJobs, visibleQuoteJobs, offers, declinedSet]);

  const openDetails = (job: MapJob) => {
    if (job.__kind === "offer") {
      const j = job.__raw?.job;
      const offer = job.__raw?.offer;
      setDetail({ ...j, offerId: offer?.id, isQuoteRequest: j?.pricing_type === "quote_request" });
    } else if (job.__kind === "quote") {
      setDetail({ ...job, isQuoteRequest: true, isOpenQuote: true });
    } else {
      setDetail({ ...job });
    }
  };

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
    if (job.__kind === "offer") {
      const offerId = job.__raw?.offer?.id;
      if (offerId) respond.mutate({ id: offerId, response: "declined" });
      return;
    }
    if (job.__kind === "quote") {
      void declineQuoteJob(job.id);
      return;
    }
    void declineOpenJob(job.id);
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
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
            <CourierJobsMap
              jobs={mapJobs}
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
                    disabled={!activeOffer || claim.isPending || respond.isPending}
                    className="size-10 rounded-full bg-surface shadow-card border border-border text-xs font-extrabold text-destructive disabled:opacity-50 active:scale-95"
                  >
                    דלג
                  </button>
                ) : undefined
              }
              leftExtra={
                showingOffer ? undefined : (
                  <Link
                    to="/courier/notifications"
                    aria-label="התראות"
                    className="size-11 grid place-items-center rounded-full bg-surface shadow-[0_6px_18px_rgba(16,24,40,0.12)] border border-border/70 text-text-strong active:scale-95"
                  >
                    <Bell className="size-4" strokeWidth={2} />
                  </Link>
                )
              }
              rightExtra={
                showingOffer || !isAvailable ? undefined : (
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
                )
              }
              emptyState={
                <SearchingCard
                  available={isAvailable}
                  jobWord={t.jobPlural}
                  me={me}
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
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                      onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number, quote: detail.existingQuote }); setDetail(null); }}
                    >
                      {detail.existingQuote ? "עדכן הצעת מחיר" : "הגש הצעת מחיר"}
                    </Button>
                    <div className="flex gap-2">
                      {!detail.existingQuote && (
                        <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold" onClick={() => declineQuoteJob(detail.id)}>דחה</Button>
                      )}
                      <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold" onClick={() => setDetail(null)}>סגור</Button>
                    </div>
                  </>
                ) : detail.offerId ? (
                  <>
                    {detail.isQuoteRequest ? (
                      <Button 
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                        onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number }); setDetail(null); }}
                      >
                        הגש הצעת מחיר
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[15px] rounded-xl shadow-sm" 
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
                        onClick={() => respond.mutate({ id: detail.offerId, response: "declined" })} 
                        disabled={respond.isPending}
                      >
                        דחה
                      </Button>
                      <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold" onClick={() => setDetail(null)}>סגור</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[15px] rounded-xl shadow-sm" 
                      onClick={() => claim.mutate(detail.id)} 
                      disabled={claim.isPending}
                    >
                      {claim.isPending && <Loader2 className="size-4 animate-spin" />}
                      {!claim.isPending && "אני לוקח את המשלוח"}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold" onClick={() => declineOpenJob(detail.id)}>דחה</Button>
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

function SearchingCard({
  available,
  jobWord,
  me,
}: {
  available: boolean;
  jobWord: string;
  me?: any;
}) {
  const qc = useQueryClient();
  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;

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
        throw new Error("החשבון ממתין לאישור או מושהה");
      }
      void (async () => {
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
          if (pushSupported() && courier.id) {
            const res = await enablePushForCourier(courier.id);
            if (!res.ok && res.reason === "denied") {
              toast.error("התראות חסומות — הפעל בהגדרות הדפדפן כדי לקבל הצעות");
            }
          }
        } catch {}
      })();
      await nestUpdateMyCourier({ accepting_jobs: true });
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
        <div className="relative mx-auto w-full max-w-lg pt-[9.5rem]">
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
              subtitle="והתחל לקבל משלוחים"
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
      <div className="mx-auto w-full max-w-lg">
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
              מחפש משלוחים באזור שלך
            </div>
            <div className="mt-1 text-[12px] leading-snug text-[#6B6B6B]">
              משלוח מתאים יקפוץ אוטומטית על המפה
            </div>
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
      if (next) await requestPermissionsOnce();
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
    : on
      ? "תקבלו משלוחים והתראות"
      : "הפעילו כדי לקבל משלוחים והתראות";

  const flip = () => {
    if (!approved || toggle.isPending) return;
    const next = !on;
    setOn(next);
    toggle.mutate(next);
  };

  if (mini) {
    return (
      <button
        type="button"
        onClick={flip}
        disabled={!approved || toggle.isPending}
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
        disabled={!approved || toggle.isPending}
        onCheckedChange={(next) => {
          if (!approved) return;
          setOn(next);
          toggle.mutate(next);
        }}
        aria-label={title}
        className={`shrink-0 overflow-hidden data-[state=checked]:bg-primary ${
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
