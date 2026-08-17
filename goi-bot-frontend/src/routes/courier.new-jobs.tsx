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
import { Bell, ChevronDown, Loader2, MessageCircle, Search, ShoppingBag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { isCourierApproved, isLivePendingOffer, isOpenBroadcastJobForCourier, isOpenQuoteJobForCourier, jobMatchesKind } from "@/lib/courier-live-jobs";
import { ContactBlock } from "@/routes/courier.history";
import { CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierJobsMap, type MapJob } from "@/components/CourierJobsMap";
import { PullToRefresh } from "@/components/courier/PullToRefresh";

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
    enabled: isApproved,
    queryFn: async () => {
      const rows = await nestListCourierDeclines();
      return rows.map((r) => ({ job_id: r.job_id }));
    },
  });
  const declinedSet = useMemo(() => new Set(declinedRows.map((r: any) => r.job_id)), [declinedRows]);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["new-jobs", me?.id, "pending"],
    enabled: isApproved,
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
    enabled: isApproved,
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
    enabled: isApproved && quoteJobIds.length > 0,
    queryFn: () => nestListCourierQuotes(quoteJobIds),
  });

  const { data: openJobs = [] } = useQuery({
    queryKey: ["courier-open-jobs", me?.id],
    enabled: isApproved,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await nestListOpenBroadcastJobs();
      return data.filter((j: any) => isOpenBroadcastJobForCourier(j, me));
    },
  });

  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

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
    const out: MapJob[] = [];
    for (const j of visibleOpenJobs as any[]) {
      out.push({ ...j, __kind: "open", __raw: j });
    }
    for (const j of visibleQuoteJobs as any[]) {
      out.push({ ...j, __kind: "quote", __raw: j });
    }
    for (const o of offers as any[]) {
      const j = o?.jobs;
      if (j) out.push({ ...j, __kind: "offer", __raw: { offer: o, job: j } });
    }
    return out;
  }, [visibleOpenJobs, visibleQuoteJobs, offers]);

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
            <div className="relative flex items-center justify-center">
              <CourierMenuButton className="absolute start-0 size-11 shadow-card border-0 shrink-0" />
              <AcceptJobsToggle me={me} compact={!showingOffer} mini={showingOffer} />
              {showingOffer && (
                <button
                  type="button"
                  onClick={() => activeOffer && handleDecline(activeOffer)}
                  disabled={!activeOffer || claim.isPending || respond.isPending}
                  className="absolute end-0 size-11 rounded-full bg-surface shadow-card text-sm font-extrabold text-destructive disabled:opacity-50 active:scale-95"
                >
                  דלג
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading && availableCount === 0 ? (
          <div className="flex-1 grid place-items-center text-text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
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
              leftExtra={
                showingOffer ? undefined : (
                  <Link
                    to="/courier/messages"
                    aria-label="התראות"
                    className="size-10 grid place-items-center rounded-full bg-surface shadow-card border border-border text-text-strong active:scale-95"
                  >
                    <Bell className="size-4" strokeWidth={2} />
                  </Link>
                )
              }
              rightExtra={
                showingOffer ? undefined : (
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
                <SearchingCard available={isAvailable} jobWord={t.jobPlural} />
              }
            />
          </div>
        )}
      </div>
      </PullToRefresh>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent dir="rtl" className="text-start [&>button]:right-auto [&>button]:left-4">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="text-start">פרטי העבודה {detail?.job_number}</DialogTitle>
            <DialogDescription className="text-start">כל פרטי האיסוף, המסירה והתשלום לפני אישור או דחייה.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm text-start">
              <DetailRow label="כמות וסוג" value={deliveryKindLabel(detail)} />

              <ContactBlock
                label="איסוף"
                address={detail.pickup_address ?? detail.pickup_area}
                name={null}
                phone={null}
              />

              <ContactBlock
                label="מסירה"
                address={detail.dropoff_address ?? detail.dropoff_area}
                name={detail.recipient_name}
                phone={detail.recipient_phone}
              />

              <DetailRow label="תאריך" value={`${detail.job_date ?? "—"} ${detail.job_time ?? ""}`.trim()} />
              {detail.customer_name && <DetailRow label="לקוח/עסק" value={detail.customer_name} />}
              {detail.payment != null && !detail.isQuoteRequest && (
                <DetailRow label="תשלום" value={`${Number(detail.payment).toFixed(0)} ₪`} />
              )}
              {detail.isQuoteRequest && (
                <DetailRow
                  label="תמחור"
                  value="בקשת הצעת מחיר — אתה קובע את המחיר"
                  className="text-warning"
                />
              )}
              {detail.vehicle_required && <DetailRow label="רכב נדרש" value={detail.vehicle_required} />}
              {(detail.service_category === "small_move" || detail.service_category === "big_move") && (
                <>
                  {detail.item_category && <DetailRow label="תכולה" value={detail.item_category} />}
                  {detail.dropoff_floor != null && String(detail.dropoff_floor) !== "" && (
                    <DetailRow label="קומה ביעד" value={String(detail.dropoff_floor)} />
                  )}
                </>
              )}
              {detail.description && <div className="bg-muted p-3 rounded-md text-start">{detail.description}</div>}
            </div>
          )}

          {detail && (
            <DialogFooter className="flex-row justify-start gap-2 sm:flex-row sm:justify-start sm:space-x-0 sm:space-x-reverse">
              {detail.isOpenQuote ? (
                <>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number, quote: detail.existingQuote }); setDetail(null); }}>
                    {detail.existingQuote ? "עדכן הצעה" : "הגש הצעת מחיר"}
                  </Button>
                  {!detail.existingQuote && (
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => declineQuoteJob(detail.id)}>דחה</Button>
                  )}
                </>
              ) : detail.offerId ? (
                <>
                  {detail.isQuoteRequest ? (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => { setQuoteFor({ jobId: detail.id, jobNumber: detail.job_number }); setDetail(null); }}>
                      הגש הצעת מחיר
                    </Button>
                  ) : (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => respond.mutate({ id: detail.offerId, response: "accepted", jobId: detail.id })} disabled={respond.isPending}>
                      {respond.isPending && <Loader2 className="size-3 animate-spin" />} {t.takeJob}
                    </Button>
                  )}
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => respond.mutate({ id: detail.offerId, response: "declined" })} disabled={respond.isPending}>דחה</Button>
                </>
              ) : (
                <>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => claim.mutate(detail.id)} disabled={claim.isPending}>
                    {claim.isPending && <Loader2 className="size-3 animate-spin" />} {t.takeJob}
                  </Button>
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => declineOpenJob(detail.id)}>דחה</Button>
                </>
              )}
              <Button variant="outline" onClick={() => setDetail(null)}>סגור</Button>
            </DialogFooter>
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

function SearchingCard({ available, jobWord }: { available: boolean; jobWord: string }) {
  if (!available) {
    return (
      <div
        dir="rtl"
        className="absolute inset-x-3 bottom-3 z-10 rounded-card bg-surface/95 backdrop-blur-md border border-border shadow-card px-5 py-5 text-center"
      >
        <div className="text-sm font-bold text-text-strong">הסטטוס כבוי</div>
        <div className="text-xs text-text-subtle mt-1 leading-snug">
          הפעילו קבלת עבודות כדי שנחפש {jobWord} באזור.
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="absolute inset-x-3 bottom-3 z-10 rounded-[1.5rem] bg-surface shadow-card-strong border border-border px-5 pb-4 pt-6 text-center"
    >
      <div className="mx-auto mb-4 grid size-16 place-items-center">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 grid place-items-center rounded-full bg-success-bg">
            <Search className="size-6 text-primary" strokeWidth={2.2} />
          </div>
        </div>
      </div>
      <div className="text-base font-extrabold text-text-strong leading-snug">
        מחפש {jobWord} זמינים עבורך
      </div>
      <div className="mt-1.5 text-xs text-text-subtle leading-snug">
        אנחנו סורקים את האזור ומחפשים {jobWord} שמתאימים עבורך
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
        <span className="size-1.5 rounded-full bg-border-strong" />
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="size-1.5 rounded-full bg-border-strong" />
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
