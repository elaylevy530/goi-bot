import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { CourierAvatar } from "@/components/CourierAvatar";
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
import { Bell, Loader2, SearchX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { isCourierApproved, isLivePendingOffer, isOpenBroadcastJobForCourier, isOpenQuoteJobForCourier, jobMatchesKind } from "@/lib/courier-live-jobs";
import { ContactBlock, ActiveJobs } from "@/routes/courier.history";
import { CourierMenuButton } from "@/components/CourierSideDrawer";

export const Route = createFileRoute("/courier/new-jobs")({
  head: () => ({ meta: [{ title: "עבודות חדשות — Goi" }] }),
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: NewJobsPage,
});

type JobsTab = "available" | "active";

function deliveryKindLabel(job: any) {
  const qty = Number(job?.number_of_packages ?? 0);
  const baseType = job?.job_type ?? "משלוח";
  const category = job?.item_category ?? job?.package_type ?? null;
  const label = qty > 0 ? `${qty} × ${baseType}` : baseType;
  return category && category !== baseType ? `${label} · ${category}` : label;
}

function shortAddress(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  return raw.split(",")[0]?.trim() || raw;
}

function NewJobsPage() {
  const { data: me } = useMyCourier();
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { jobId: focusJobId } = Route.useSearch();
  const isApproved = isCourierApproved(me);
  const [tab, setTab] = useState<JobsTab>("available");
  const [detail, setDetail] = useState<any>(null);
  const [quoteFor, setQuoteFor] = useState<any>(null);

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

  const { data: activeCount = 0 } = useQuery({
    queryKey: ["courier-active-count", me?.id],
    enabled: !!me?.id,
    refetchInterval: 15_000,
    queryFn: () => nestCourierActiveJobCount(),
  });

  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
      qc.invalidateQueries({ queryKey: ["courier-active-count"] });
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
      qc.invalidateQueries({ queryKey: ["courier-active-count"] });
      if (v.response === "accepted") navigate({ to: "/courier/active" });
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
    onSuccess: () => {
      toast.success("העבודה נלקחה ✓");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
      qc.invalidateQueries({ queryKey: ["new-jobs"] });
      qc.invalidateQueries({ queryKey: ["accepted-jobs"] });
      qc.invalidateQueries({ queryKey: ["courier-active-count"] });
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

  type ListJob = {
    id: string;
    job_number?: string;
    pickup_address?: string | null;
    pickup_area?: string | null;
    dropoff_address?: string | null;
    dropoff_area?: string | null;
    payment?: number | string | null;
    pricing_type?: string | null;
    job_type?: string | null;
    item_category?: string | null;
    package_type?: string | null;
    number_of_packages?: number | null;
    __kind: "open" | "quote" | "offer";
    __raw: any;
  };

  const availableJobs: ListJob[] = useMemo(() => {
    const out: ListJob[] = [];
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

  const openDetails = (job: ListJob) => {
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

  const displayName = me?.full_name?.trim() || "שליח";
  const availableCount = availableJobs.length;

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-bg">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6">
          <div className="flex flex-col gap-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {/* Header — Figma home-dashboard */}
            <div className="flex items-center justify-between px-6 py-2">
              <CourierMenuButton className="size-11 shadow-card border-0" />

              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0 text-right">
                  <p className="text-[13px] text-text-subtle leading-tight">שלום,</p>
                  <p className="text-lg font-bold text-text-strong truncate leading-tight">{displayName}</p>
                </div>
                <CourierAvatar
                  path={(me as { avatar_url?: string | null } | null | undefined)?.avatar_url}
                  name={displayName}
                  size={48}
                />
                <Link
                  to="/courier/messages"
                  aria-label="הודעות"
                  className="size-11 grid place-items-center rounded-full bg-surface shadow-card text-text-strong active:bg-muted transition-colors shrink-0"
                >
                  <Bell className="size-5" strokeWidth={2} />
                </Link>
              </div>
            </div>

            {/* Status card — status toggle only (no cash toggle) */}
            <div className="px-6">
              <AcceptJobsToggle me={me} />
            </div>

            {/* Section title + tabs */}
            <div className="px-6 pt-2">
              <h2 className="text-lg font-bold text-text-strong text-right">
                {t.kind === "mover" ? "הובלות באזורך" : "משלוחים באזורך"}
              </h2>
            </div>

            <div className="px-6">
              <div className="flex w-full rounded-[14px] bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setTab("active")}
                  className={`flex-1 min-h-11 rounded-[10px] px-2 py-2.5 text-sm text-center transition-all ${
                    tab === "active"
                      ? "bg-surface font-bold text-primary shadow-card"
                      : "font-semibold text-text-subtle"
                  }`}
                >
                  {t.kind === "mover" ? `הובלות פעילות (${activeCount})` : `משלוחים פעילים (${activeCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("available")}
                  className={`flex-1 min-h-11 rounded-[10px] px-2 py-2.5 text-sm text-center transition-all ${
                    tab === "available"
                      ? "bg-surface font-bold text-primary shadow-card"
                      : "font-semibold text-text-subtle"
                  }`}
                >
                  {t.kind === "mover" ? `הובלות זמינות (${availableCount})` : `משלוחים זמינים (${availableCount})`}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              {tab === "active" ? (
                <ActiveJobs />
              ) : isLoading && availableCount === 0 ? (
                <div className="flex justify-center py-16 text-text-muted">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : availableCount === 0 ? (
                <EmptyAvailableState kind={t.kind} />
              ) : (
                <ul className="flex flex-col gap-3">
                  {availableJobs.map((job) => {
                    const isQuote = job.__kind === "quote" || job.pricing_type === "quote_request";
                    const payment = job.payment != null && !isQuote ? `${Number(job.payment).toFixed(0)} ₪` : null;
                    return (
                      <li key={`${job.__kind}-${job.id}`}>
                        <button
                          type="button"
                          onClick={() => openDetails(job)}
                          className="w-full rounded-[20px] bg-surface shadow-card p-5 text-right active:bg-muted/60 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-bold text-text-strong truncate">
                                {deliveryKindLabel(job)}
                              </p>
                              <p className="mt-1 text-sm text-text-subtle">
                                {shortAddress(job.pickup_address ?? job.pickup_area)}
                                {" → "}
                                {shortAddress(job.dropoff_address ?? job.dropoff_area)}
                              </p>
                              {job.job_number && (
                                <p className="mt-1 text-xs text-text-muted">#{job.job_number}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-left">
                              {payment ? (
                                <p className="text-base font-extrabold text-primary">{payment}</p>
                              ) : (
                                <p className="text-xs font-bold text-warning-text bg-warning-bg rounded-pill px-2 py-1">
                                  הצעת מחיר
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי העבודה {detail?.job_number}</DialogTitle>
            <DialogDescription className="text-right">כל פרטי האיסוף, המסירה והתשלום לפני אישור או דחייה.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm text-end">
              <div><b>כמות וסוג:</b> {deliveryKindLabel(detail)}</div>

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

              <div><b>תאריך:</b> {detail.job_date ?? "—"} {detail.job_time ?? ""}</div>
              {detail.customer_name && <div><b>לקוח/עסק:</b> {detail.customer_name}</div>}
              {detail.payment != null && !detail.isQuoteRequest && <div><b>תשלום:</b> {Number(detail.payment).toFixed(0)} ₪</div>}
              {detail.isQuoteRequest && <div className="text-amber-700"><b>תמחור:</b> בקשת הצעת מחיר — אתה קובע את המחיר</div>}
              {detail.vehicle_required && <div><b>רכב נדרש:</b> {detail.vehicle_required}</div>}
              {(detail.service_category === "small_move" || detail.service_category === "big_move") && (
                <>
                  {detail.item_category && <div><b>תכולה:</b> {detail.item_category}</div>}
                  {detail.dropoff_floor != null && String(detail.dropoff_floor) !== "" && <div><b>קומה ביעד:</b> {detail.dropoff_floor}</div>}
                </>
              )}
              {detail.description && <div className="bg-slate-50 p-3 rounded">{detail.description}</div>}
            </div>
          )}

          {detail && (
            <DialogFooter className="flex-row-reverse gap-2 sm:gap-2">
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

function EmptyAvailableState({ kind }: { kind: "courier" | "mover" }) {
  const noun = kind === "mover" ? "הובלות" : "משלוחים";
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-2 py-12 text-center">
      <div className="rounded-full bg-info-bg p-4 text-primary">
        <SearchX className="size-9" strokeWidth={2} aria-hidden />
      </div>
      <div className="flex flex-col gap-2 items-center max-w-[280px]">
        <p className="text-xl font-bold text-text-strong">
          {`אין כרגע ${noun} באזורכם`}
        </p>
        <p className="text-sm text-text-subtle">
          משכו למטה לרענון, או נסעו לאזור עמוס יותר.
        </p>
      </div>
    </div>
  );
}

function AcceptJobsToggle({ me }: { me: any }) {
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
      ? "סטטוס - פעיל"
      : "סטטוס - לא פעיל";
  const subtitle = !approved
    ? "החשבון ממתין לאישור או מושהה"
    : on
      ? "תקבלו משלוחים והתראות"
      : "הפעילו כדי לקבל משלוחים והתראות";

  return (
    <div
      className={`w-full rounded-[20px] bg-surface shadow-card p-5 flex items-center justify-between gap-4 ${
        !approved ? "opacity-70" : ""
      }`}
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
        className="shrink-0 h-8 w-[3.25rem] [&>span]:size-6 data-[state=checked]:[&>span]:translate-x-[1.35rem] data-[state=checked]:bg-primary"
      />
      <div className="min-w-0 flex-1 text-right">
        <div className="text-base font-bold text-text-strong leading-tight truncate">{title}</div>
        <div className="text-[13px] text-text-subtle mt-0.5 leading-snug">{subtitle}</div>
      </div>
    </div>
  );
}
