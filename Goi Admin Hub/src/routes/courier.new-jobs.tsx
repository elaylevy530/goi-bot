import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { termsFor } from "@/lib/courier-kind";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Inbox, Loader2, MapPin, Clock, Truck, FileText, Tag, HandCoins, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { isCourierApproved, isLivePendingOffer, isOpenBroadcastJobForCourier, isOpenQuoteJobForCourier, jobMatchesKind } from "@/lib/courier-live-jobs";
import { CourierJobsMap, type MapJob } from "@/components/CourierJobsMap";
import { geocodeAddresses } from "@/lib/geocode.functions";
import { ContactBlock } from "@/routes/courier.history";



export const Route = createFileRoute("/courier/new-jobs")({
  head: () => ({ meta: [{ title: "עבודות חדשות — Goi" }] }),
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: NewJobsPage,
});

const STATUSES = ["pending", "accepted", "declined", "expired"] as const;
type Status = typeof STATUSES[number];

const statusLabel: Record<string, string> = {
  pending: "ממתין", accepted: "אישרת", declined: "דחית", expired: "פג תוקף",
};

function deliveryKindLabel(job: any) {
  const qty = Number(job?.number_of_packages ?? 0);
  const baseType = job?.job_type ?? "משלוח";
  const category = job?.item_category ?? job?.package_type ?? null;
  const label = qty > 0 ? `${qty} × ${baseType}` : baseType;
  return category && category !== baseType ? `${label} · ${category}` : label;
}

function NewJobsPage() {
  const { data: me } = useMyCourier();
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { jobId: focusJobId } = Route.useSearch();
  const isApproved = isCourierApproved(me);



  const [filter, setFilter] = useState<Status | "all">("pending");
  const [detail, setDetail] = useState<any>(null);
  const [quoteFor, setQuoteFor] = useState<any>(null);

  // Persisted declines from DB
  const { data: declinedRows = [] } = useQuery({
    queryKey: ["courier-job-declines", me?.id],
    enabled: isApproved,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_job_declines" as any)
        .select("job_id")
        .eq("courier_id", me!.id);
      if (error) throw error;
      return (data ?? []) as unknown as { job_id: string }[];
    },
  });
  const declinedSet = useMemo(() => new Set(declinedRows.map((r: any) => r.job_id)), [declinedRows]);

  // Existing offer_events flow (fixed price)
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["new-jobs", me?.id, filter],
    enabled: isApproved,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let q = supabase
        .from("offer_events")
        .select("id, sent_at, response, expires_at, jobs(id, job_number, service_category, job_type, pickup_area, pickup_address, pickup_lat, pickup_lng, dropoff_area, dropoff_address, dropoff_lat, dropoff_lng, recipient_name, recipient_phone, job_date, job_time, delivery_deadline, payment, description, vehicle_required, customer_name, customer_id, customer_logo_path, requires_cash, pricing_type, status, selected_courier_id, created_at, number_of_packages, item_category, package_size, package_type, dropoff_floor, item_value)")
        .eq("courier_id", me!.id)
        .order("sent_at", { ascending: false });
      if (filter === "pending") {
        // For "pending" tab, only filter live pending offers below
      } else if (filter !== "all") {
        q = q.eq("response", filter);
      }
      const { data, error } = await q;
      if (error) throw error;
      // Movers only see moving jobs; couriers only see deliveries.
      const rows = (data ?? []).filter((offer: any) => {
        const job = Array.isArray(offer?.jobs) ? offer.jobs[0] : offer?.jobs;
        return job ? jobMatchesKind(job, me) : false;
      });
      if (filter === "pending") {
        return rows.filter((offer: any) => isLivePendingOffer(offer, me));
      }
      return rows;

    },
  });

  // Open quote requests visible to all couriers
  const { data: quoteJobs = [] } = useQuery({
    queryKey: ["courier-quote-requests", me?.id],
    enabled: isApproved,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, service_category, job_type, pickup_area, pickup_address, pickup_lat, pickup_lng, dropoff_area, dropoff_address, dropoff_lat, dropoff_lng, recipient_name, recipient_phone, job_date, job_time, delivery_deadline, description, vehicle_required, customer_name, customer_id, customer_logo_path, requires_cash, quote_deadline_at, pricing_type, status, selected_quote_id, created_at, number_of_packages, item_category, package_size, package_type, dropoff_floor, item_value")
        .eq("pricing_type", "quote_request")
        .is("selected_quote_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((j: any) => isOpenQuoteJobForCourier(j, me));
    },
  });

  // My existing quotes for those jobs
  const quoteJobIds = useMemo(() => quoteJobs.map((j: any) => j.id), [quoteJobs]);
  const quoteJobIdsKey = quoteJobIds.join(",");
  const { data: myQuotes = [] } = useQuery({
    queryKey: ["my-quotes-on-open", me?.id, quoteJobIdsKey],
    enabled: isApproved && quoteJobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("*")
        .eq("courier_id", me!.id)
        .in("job_id", quoteJobIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Open broadcast jobs (fixed price, no courier picked yet) — visible thanks to RLS policy.
  // Live: a job stays visible to ALL eligible couriers until someone claims it.
  const { data: openJobs = [] } = useQuery({
    queryKey: ["courier-open-jobs", me?.id],
    enabled: isApproved,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, service_category, job_type, pickup_area, pickup_address, pickup_lat, pickup_lng, dropoff_area, dropoff_address, dropoff_lat, dropoff_lng, recipient_name, recipient_phone, job_date, job_time, delivery_deadline, payment, description, vehicle_required, customer_name, customer_id, customer_logo_path, requires_cash, created_at, status, selected_courier_id, pricing_type, number_of_packages, item_category, package_size, package_type, dropoff_floor, item_value")
        .is("selected_courier_id", null)
        .eq("status", "נשלחה לשליחים")
        .neq("pricing_type", "quote_request")
        .or(`job_date.is.null,job_date.gte.${today}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((j: any) => isOpenBroadcastJobForCourier(j, me));
    },
  });

  // Realtime: listen for new jobs broadcast
  useEffect(() => {
    if (!me?.id) return;
    const ch = supabase.channel(`open-jobs-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        qc.invalidateQueries({ queryKey: ["courier-open-jobs"] });
        qc.invalidateQueries({ queryKey: ["new-jobs"] });
        qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "offer_events", filter: `courier_id=eq.${me.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["new-jobs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, qc]);

  const quoteByJob = useMemo(() => {
    const map: Record<string, any> = {};
    for (const q of myQuotes) map[q.job_id] = q;
    return map;
  }, [myQuotes]);

  // Push notification deep link: /courier/new-jobs?jobId=<id>.
  // Do NOT open the details dialog — the courier should see the offer card
  // on the map first and decide from there. Just clear the query param.
  useEffect(() => {
    if (!focusJobId) return;
    navigate({ to: "/courier/new-jobs", search: {}, replace: true });
  }, [focusJobId, navigate]);




  const respond = useMutation({
    mutationFn: async ({ id, response, jobId }: { id: string; response: "accepted" | "declined"; jobId?: string }) => {
      const { data, error } = await supabase.rpc("courier_respond_offer" as any, { _offer_id: id, _response: response } as any);
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).reason || "taken");
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
      const { data, error } = await supabase.rpc("courier_claim_job" as any, { _job_id: jobId, _source: "new-jobs" } as any);
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any).reason || "taken");
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
    if (!me?.id) return;
    const { error } = await supabase
      .from("courier_job_declines" as any)
      .upsert({ courier_id: me.id, job_id: jobId } as any, { onConflict: "courier_id,job_id" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["courier-job-declines", me.id] });
    return true;
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

  // Once I submitted a quote the job moves to "ההצעות שלי" — remove it from the map/list.
  const visibleQuoteJobs = useMemo(
    () => (quoteJobs as any[]).filter((j) => {
      if (declinedSet.has(j.id)) return false;
      const q = quoteByJob[j.id];
      if (q && !["rejected", "cancelled", "expired"].includes(q.status)) return false;
      return true;
    }),
    [quoteJobs, declinedSet, quoteByJob],
  );


  // Build raw map jobs from all sources
  const rawMapJobs: MapJob[] = useMemo(() => {
    const out: MapJob[] = [];
    for (const j of visibleOpenJobs as any[]) {
      out.push({ ...j, __kind: "open", __raw: j } as MapJob);
    }
    for (const j of visibleQuoteJobs as any[]) {
      out.push({ ...j, __kind: "quote", __raw: j } as MapJob);
    }
    for (const o of offers as any[]) {
      const j = o?.jobs;
      if (j) out.push({ ...j, __kind: "offer", __raw: { offer: o, job: j } } as MapJob);
    }
    return out;
  }, [visibleOpenJobs, visibleQuoteJobs, offers]);

  // Geocode jobs that lack pickup/dropoff coords (client-cached, per id+role)
  const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lng: number } | null>>({});
  useEffect(() => {
    const needs: { id: string; address: string; role: "p" | "d"; jobId: string }[] = [];
    for (const j of rawMapJobs) {
      const pKey = `${j.id}:p`;
      const dKey = `${j.id}:d`;
      if ((j.pickup_lat == null || j.pickup_lng == null) && !(pKey in geoCache)) {
        const addr = String(j.pickup_address ?? j.pickup_area ?? "").trim();
        if (addr) needs.push({ id: pKey, address: addr, role: "p", jobId: j.id });
      }
      if ((j.dropoff_lat == null || j.dropoff_lng == null) && !(dKey in geoCache)) {
        const addr = String(j.dropoff_address ?? j.dropoff_area ?? "").trim();
        if (addr) needs.push({ id: dKey, address: addr, role: "d", jobId: j.id });
      }
    }
    if (!needs.length) return;
    let cancelled = false;
    geocodeAddresses({ data: { items: needs.map(n => ({ id: n.id, address: n.address })) } })
      .then((res) => {
        if (cancelled) return;
        setGeoCache((prev) => {
          const next = { ...prev };
          for (const r of res) {
            next[r.id] = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [rawMapJobs, geoCache]);

  const mapJobs: MapJob[] = useMemo(() => {
    return rawMapJobs
      .map((j) => {
        let out: MapJob = j;
        if (out.pickup_lat == null || out.pickup_lng == null) {
          const g = geoCache[`${j.id}:p`];
          if (g) out = { ...out, pickup_lat: g.lat, pickup_lng: g.lng };
        }
        if (out.dropoff_lat == null || out.dropoff_lng == null) {
          const g = geoCache[`${j.id}:d`];
          if (g) out = { ...out, dropoff_lat: g.lat, dropoff_lng: g.lng };
        }
        if (out.pickup_lat == null || out.pickup_lng == null) return null;
        return out;
      })
      .filter(Boolean) as MapJob[];
  }, [rawMapJobs, geoCache]);

  const handleMapClaim = (mj: MapJob) => {
    if (mj.__kind === "offer") {
      const offerId = mj.__raw?.offer?.id;
      if (offerId) respond.mutate({ id: offerId, response: "accepted", jobId: mj.id });
    } else {
      claim.mutate(mj.id);
    }
  };
  const handleMapDecline = (mj: MapJob) => {
    if (mj.__kind === "offer") {
      const offerId = mj.__raw?.offer?.id;
      if (offerId) respond.mutate({ id: offerId, response: "declined" });
    } else if (mj.__kind === "quote") {
      declineQuoteJob(mj.id);
    } else {
      declineOpenJob(mj.id);
    }
  };
  const handleMapQuote = (mj: MapJob) => {
    setQuoteFor({ jobId: mj.id, jobNumber: mj.job_number });
  };
  const handleMapDetails = (mj: MapJob) => {
    if (mj.__kind === "offer") {
      const job = mj.__raw?.job;
      const offer = mj.__raw?.offer;
      setDetail({ ...job, offerId: offer?.id, isQuoteRequest: job?.pricing_type === "quote_request" });
    } else if (mj.__kind === "quote") {
      setDetail({ ...mj, isQuoteRequest: true, isOpenQuote: true });
    } else {
      setDetail({ ...mj });
    }
  };

  return (
    <CourierShell fullBleed>
      <div className="relative flex-1 min-h-0 flex flex-col">
        <AcceptJobsToggle me={me} />
        <CourierJobsMap
          jobs={mapJobs}
          onClaim={handleMapClaim}
          onDecline={handleMapDecline}
          onQuote={handleMapQuote}
          onDetails={handleMapDetails}
          claiming={claim.isPending || respond.isPending}
        />
      </div>



      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent dir="rtl" className="p-0 gap-0 max-w-[min(95vw,400px)]">
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

function AcceptJobsToggle({ me }: { me: any }) {
  const qc = useQueryClient();
  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    if (!me) return;
    setOn(approved && me.accepting_jobs !== false);
  }, [me, approved]);

  // One-shot permission requests when the user first turns the toggle on.
  const requestPermissionsOnce = async () => {
    // 1) GPS — prompts the OS location dialog once; browser caches the decision.
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
    // 2) Push notifications — enablePushForCourier handles permission + subscription upsert.
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
      const { error } = await supabase.from("couriers").update({ accepting_jobs: next } as any).eq("id", me.id);
      if (error) throw error;
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

  // Floating pill overlay — sits on top of the map, doesn't consume vertical space.
  return (
    <div
      dir="rtl"
      className="absolute top-[calc(env(safe-area-inset-top,0px)+0.75rem)] inset-x-3 z-20 pointer-events-none"
    >
      <button
        type="button"
        disabled={!approved || toggle.isPending}
        onClick={() => {
          if (!approved) return;
          const next = !on;
          setOn(next);
          toggle.mutate(next);
        }}
        className={`pointer-events-auto w-full rounded-full backdrop-blur-md border shadow-lg px-4 py-2.5 flex items-center justify-between gap-3 transition ${
          on
            ? "bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-200/60"
            : "bg-white/95 border-slate-200 text-slate-700"
        } ${!approved ? "opacity-60" : "active:scale-[0.99]"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`relative grid place-items-center size-8 rounded-full ${on ? "bg-white/25" : "bg-slate-100"}`}>
            <Power className={`size-4 ${on ? "text-white" : "text-slate-500"}`} />
            {on && <span className="absolute inset-0 rounded-full ring-2 ring-white/60 animate-ping" />}
          </span>
          <span className="text-right min-w-0">
            <span className="block text-[13px] font-extrabold leading-tight truncate">
              {on ? "מקבל עבודות" : approved ? "לחץ להפעלה" : "החשבון לא פעיל"}
            </span>
            <span className={`block text-[10.5px] leading-tight ${on ? "text-white/85" : "text-slate-500"}`}>
              {on ? "מקבל התראות בזמן אמת" : "הצעות חדשות יופיעו כאן"}
            </span>
          </span>
        </span>
        <span className={`shrink-0 text-[11px] font-extrabold px-2 py-1 rounded-full ${
          on ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {on ? "פעיל" : "כבוי"}
        </span>
      </button>
    </div>
  );
}


