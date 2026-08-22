import { createFileRoute } from "@tanstack/react-router";
import { useCourierTerms } from "@/lib/courier-kind";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, ChevronDown, ClipboardCheck, Clock, History as HistoryIcon,
  Info, MapPin, MessageCircle, Navigation, Package, Phone, Star, Truck, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CourierReports } from "@/components/courier/CourierReports";
import { BusinessLogo } from "@/components/BusinessLogo";


export const Route = createFileRoute("/courier/history")({
  head: () => ({ meta: [{ title: "העבודות שלי — Goi" }] }),
  component: HistoryPage,
});

// ============ pipeline definition ============
type Stage = "assigned" | "to_pickup" | "picked_up" | "delivered";

const STAGES: { key: Stage; label: string; short: string; icon: any; color: string }[] = [
  { key: "assigned",  label: "אושר",             short: "אושר",   icon: CheckCircle2, color: "text-sky-600" },
  { key: "to_pickup", label: "בדרך לאיסוף",      short: "לאיסוף", icon: Navigation,   color: "text-sky-600" },
  { key: "picked_up", label: "אספתי",            short: "אספתי",  icon: Package,      color: "text-orange-600" },
  { key: "delivered", label: "נמסר",             short: "נמסר",   icon: CheckCircle2, color: "text-teal-600" },
];

function stageOf(j: any, currentStep?: string): Stage {
  const outcome = Array.isArray(j?.job_outcomes) ? j.job_outcomes[0] : j?.job_outcomes;
  if (outcome?.delivered_at || currentStep === "נמסר") return "delivered";
  if (
    outcome?.picked_up_at ||
    currentStep === "אספתי" ||
    currentStep === "נאסף" ||
    currentStep === "בדרך למסירה"
  ) return "picked_up";
  if (
    currentStep === "בדרך לאיסוף" ||
    currentStep === "הגעתי לאיסוף"
  ) return "to_pickup";
  return "assigned";
}


function stageIndex(s: Stage) { return STAGES.findIndex(x => x.key === s); }

// ============ ActiveJobs (Kanban-style filter + compact expandable cards) ============
export function ActiveJobs() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [contactJob, setContactJob] = useState<any>(null);
  const [filter, setFilter] = useState<Stage | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    const ch = supabase
      .channel(`courier-active-${me.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `selected_courier_id=eq.${me.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["active-jobs", me.id] });
        qc.invalidateQueries({ queryKey: ["history-outcomes", me.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "status_logs", filter: "entity_type=eq.job" }, () => {
        qc.invalidateQueries({ queryKey: ["active-job-steps"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "job_outcomes", filter: `courier_id=eq.${me.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["active-jobs", me.id] });
        qc.invalidateQueries({ queryKey: ["history-outcomes", me.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me?.id, qc]);

  const { data: jobs = [] } = useQuery({
    queryKey: ["active-jobs", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60000, refetchIntervalInBackground: false, refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, job_type, status, pickup_area, pickup_address, pickup_contact_name, pickup_contact_phone, pickup_notes, dropoff_area, dropoff_address, dropoff_building, dropoff_entrance, dropoff_floor, dropoff_apartment, dropoff_notes, recipient_name, recipient_phone, job_date, job_time, delivery_deadline, payment, customer_name, customer_logo_path, description, job_outcomes(picked_up_at, delivered_at)")
        .eq("selected_courier_id", me!.id)
        .not("status", "in", '("הושלמה","בוטלה")')
        .order("job_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lastSteps = {} } = useQuery({
    queryKey: ["active-job-steps", jobs.map((j) => j.id).join(",")],
    enabled: jobs.length > 0,
    queryFn: async () => {
      const ids = jobs.map((j) => j.id);
      const { data } = await supabase
        .from("status_logs")
        .select("entity_id, new_status, created_at")
        .eq("entity_type", "job")
        .in("entity_id", ids)
        .order("created_at", { ascending: false });
      const map: Record<string, string> = {};
      for (const row of data ?? []) if (!map[row.entity_id]) map[row.entity_id] = row.new_status;
      return map;
    },
  });

  const setStep = useMutation({
    mutationFn: async ({ job_id, step }: { job_id: string; step: string }) => {
      const { error } = await (supabase.rpc as any)("courier_update_job_progress", { _job_id: job_id, _step: step });
      if (error) throw error;
      const statusMap: Record<string, string> = {
        "בדרך לאיסוף": "heading_to_pickup",
        "אספתי": "picked_up",
        "נמסר": "delivered",
      };
      const status = statusMap[step];
      if (status) {
        try {
          const { notifyBusinessJobStatusFn } = await import("@/lib/business-status-push.functions");
          void notifyBusinessJobStatusFn({ data: { jobId: job_id, status } });
        } catch (e) {
          console.error("[notify-business-status] client dispatch failed", e);
        }
        try {
          const { notifyCustomerJobStatusFn } = await import("@/lib/customer-status-push.functions");
          void notifyCustomerJobStatusFn({ data: { jobId: job_id, status } });
        } catch (e) {
          console.error("[notify-customer-status] client dispatch failed", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("הסטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-job-steps"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const openNav = (addr?: string | null) => {
    if (!addr) return toast.error("אין כתובת");
    window.open(`https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`, "_blank");
  };

  // group by stage for counters
  const grouped = useMemo(() => {
    const g: Record<Stage, any[]> = { assigned: [], to_pickup: [], picked_up: [], delivered: [] };
    for (const j of jobs) {
      const step = (lastSteps as Record<string, string>)[j.id];
      g[stageOf(j, step)].push(j);
    }
    return g;
  }, [jobs, lastSteps]);

  const visible = filter === "all" ? jobs : grouped[filter];

  if (jobs.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-14 text-center text-slate-500">
          <ClipboardCheck className="size-10 mx-auto mb-3 opacity-50" />
          אין עבודות פעילות כרגע
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header count strip */}
      <div className="flex items-end justify-between px-1">
        <div className="text-sm text-slate-500">{jobs.length} משלוחים בביצוע</div>
        <div className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">משמרת פעילה</div>
      </div>

      {jobs.map((j) => {
        const step = (lastSteps as Record<string, string>)[j.id];
        const stage = stageOf(j, step);
        const sIdx = stageIndex(stage);
        const outcome = Array.isArray((j as any).job_outcomes) ? (j as any).job_outcomes[0] : (j as any).job_outcomes;
        const pickedUp = !!outcome?.picked_up_at;
        const delivered = !!outcome?.delivered_at;
        const deadline = (j as any).delivery_deadline as string | null;
        const primary = getPrimaryAction(stage, pickedUp);
        const st = STAGE_STYLES[stage];

        const dropoffExtra = [
          j.dropoff_building && `בניין ${j.dropoff_building}`,
          j.dropoff_entrance && `כניסה ${j.dropoff_entrance}`,
          j.dropoff_floor && `קומה ${j.dropoff_floor}`,
          j.dropoff_apartment && `דירה ${j.dropoff_apartment}`,
        ].filter(Boolean).join(" · ");

        return (
          <Card
            key={j.id}
            className="relative rounded-2xl overflow-hidden p-0 gap-0 border border-black/15 bg-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)]"
          >
            {/* Brand header — system green with business logo */}
            <div className="relative px-3.5 pt-3 pb-3 text-white bg-gradient-to-l from-[#0b3b2e] via-[#12604a] to-[#1c8a5b]">
              {/* subtle top sheen */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />



              <div className="relative flex items-center justify-between mb-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  {STAGES[sIdx].label}
                </span>
                <span className="text-[10.5px] font-mono text-white/70">#{j.job_number}</span>
              </div>

              <div className="relative flex items-start justify-between gap-2.5">
                <div className="min-w-0 text-end flex-1">
                  <h3 className="font-bold text-[15px] text-white truncate leading-tight">{j.customer_name ?? "משלוח"}</h3>
                  {j.recipient_name && <p className="text-white/75 text-[11.5px] truncate mt-0.5">נמען: {j.recipient_name}</p>}
                  <div className="mt-1.5 inline-flex items-baseline gap-1.5">
                    <span className="text-white font-extrabold text-[18px] leading-none tracking-tight">{Number(j.payment).toFixed(0)}</span>
                    <span className="text-white/80 text-[11px] font-semibold">₪</span>
                    {deadline && (
                      <span className="text-white/85 text-[10.5px] font-medium flex items-center gap-1 mr-2">
                        <Clock className="size-2.5" /> עד {deadline.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
                <BusinessLogo
                  path={(j as any).customer_logo_path}
                  name={j.customer_name}
                  size={44}
                  className="ring-2 ring-white/40 border-white/70"
                />
              </div>
            </div>


            <div className="px-3.5 pt-3 pb-3 space-y-2.5 bg-white">




              {/* Timeline (compact) */}
              <div className="relative pr-2">
                <div className="absolute top-1.5 right-[6px] bottom-1.5 w-px bg-slate-200" />
                <TimelineStop
                  label="איסוף"
                  address={j.pickup_address ?? j.pickup_area}
                  extras={j.pickup_notes}
                  done={pickedUp || delivered}
                  current={sIdx === 0}
                />
                <TimelineStop
                  label="מסירה"
                  address={j.dropoff_address ?? j.dropoff_area}
                  extras={dropoffExtra || j.dropoff_notes || null}
                  done={delivered}
                  current={sIdx >= 1}
                  last
                />
              </div>

              {/* Contact row */}
              {/* Contact and details */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-2 text-slate-600 text-[12px] font-medium py-2 hover:text-slate-800 transition-colors">
                    <ChevronDown className="size-4" />
                    יצירת קשר ופרטים
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <SoftBtn
                      icon={MessageCircle}
                      label="צ׳אט עסק"
                      tint="green"
                      onClick={() => {
                        const p = j.pickup_contact_phone;
                        if (!p) return toast.error("אין מספר עסק");
                        window.open(`https://wa.me/${String(p).replace(/\D/g, "")}`, "_blank");
                      }}
                    />
                    <SoftBtn
                      icon={Phone}
                      label="חיוג ללקוח"
                      tint="blue"
                      onClick={() => {
                        const p = j.recipient_phone;
                        if (p) window.location.href = `tel:${p}`;
                        else toast.error("אין מספר לקוח");
                      }}
                    />
                    <SoftBtn icon={Info} label="פרטים" tint="slate" onClick={() => setContactJob(j)} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {!pickedUp && !delivered && (
                <button
                  type="button"
                  onClick={() => openNav(j.pickup_address ?? j.pickup_area)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl min-h-14 font-bold text-[15px] text-white bg-gradient-to-l from-emerald-600 to-emerald-500 shadow-[0_4px_14px_-2px_rgba(5,150,105,0.5)] active:scale-[0.99] transition-all"
                >
                  <Navigation className="size-5" strokeWidth={2.5} />
                  התחל ניווט לאיסוף
                </button>
              )}
              {pickedUp && !delivered && (
                <button
                  type="button"
                  onClick={() => openNav(j.dropoff_address ?? j.dropoff_area)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl min-h-14 font-bold text-[15px] text-white bg-gradient-to-l from-blue-600 to-blue-500 shadow-[0_4px_14px_-2px_rgba(37,99,235,0.5)] active:scale-[0.99] transition-all"
                >
                  <Navigation className="size-5" strokeWidth={2.5} />
                  התחל ניווט למסירה
                </button>
              )}

              {/* Primary action — status update button */}
              {primary && (
                <button
                  onClick={() => setStep.mutate({ job_id: j.id, step: primary.step })}
                  disabled={setStep.isPending}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-xl min-h-14 font-bold text-[15px] text-white",
                    primary.btn,
                    "transition-all active:scale-[0.99] disabled:opacity-60",
                    primary.shadow,
                  )}

                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <primary.icon className="size-5" strokeWidth={2.5} />
                    <span className="tracking-tight">{primary.label}</span>
                  </span>
                </button>
              )}



            </div>
          </Card>
        );
      })}

      {jobs.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-14 text-center text-slate-500">
            <ClipboardCheck className="size-10 mx-auto mb-3 opacity-50" />
            אין עבודות פעילות כרגע
          </CardContent>
        </Card>
      )}


      <Dialog open={!!contactJob} onOpenChange={(o) => !o && setContactJob(null)}>
        <DialogContent dir="rtl" className="max-w-md max-h-[92vh] overflow-hidden p-0 gap-0 border border-black/15 rounded-2xl">
          {/* Granite header */}
          <div className="relative px-4 pt-4 pb-4 text-white bg-gradient-to-l from-[#0b3b2e] via-[#12604a] to-[#1c8a5b]">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
            <DialogHeader className="relative space-y-1">
              <DialogTitle className="text-end text-white text-[16px] font-extrabold">
                בון משלוח
              </DialogTitle>
              <DialogDescription className="text-end text-white/80 text-[11.5px] font-mono">
                #{contactJob?.job_number}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto max-h-[calc(92vh-140px)] px-4 py-3 bg-slate-50/60">
            {contactJob && <BonDetails job={contactJob} />}
          </div>

          <DialogFooter className="px-4 py-3 border-t border-black/10 bg-white">
            <Button variant="outline" className="w-full h-10 rounded-xl" onClick={() => setContactJob(null)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ---- Timeline stop + stage styles ----
const STAGE_STYLES: Record<Stage, {
  chipBg: string; chipText: string; chipRing: string; dot: string;
  cardBg: string; cardBorder: string; accent: string;
}> = {
  assigned: {
    chipBg: "bg-sky-100", chipText: "text-sky-800", chipRing: "ring-sky-200", dot: "bg-sky-500",
    cardBg: "bg-gradient-to-bl from-sky-100/80 via-sky-50/40 to-white",
    cardBorder: "border-sky-300/70", accent: "bg-sky-500",
  },
  // card tint reflects the NEXT action's color (the button the courier needs to press)
  to_pickup: {
    chipBg: "bg-sky-100",   chipText: "text-sky-800",   chipRing: "ring-sky-200",   dot: "bg-sky-500",
    // next action = "אספתי" (orange)
    cardBg: "bg-gradient-to-bl from-orange-100/80 via-orange-50/40 to-white",
    cardBorder: "border-orange-300/70", accent: "bg-orange-500",
  },
  picked_up: {
    chipBg: "bg-orange-100",  chipText: "text-orange-900",  chipRing: "ring-orange-200",  dot: "bg-orange-500",
    // next action = "נמסר" (teal)
    cardBg: "bg-gradient-to-bl from-teal-100/80 via-teal-50/40 to-white",
    cardBorder: "border-teal-300/70", accent: "bg-teal-500",
  },
  delivered: {
    chipBg: "bg-teal-100", chipText: "text-teal-800", chipRing: "ring-teal-200", dot: "bg-teal-500",
    cardBg: "bg-gradient-to-bl from-slate-50 via-white to-white",
    cardBorder: "border-slate-200/70", accent: "bg-teal-500",
  },

};

function DeliveryCountdown({ jobDate, deadline, nowTick }: { jobDate?: string | null; deadline: string; nowTick: number }) {
  // deadline is "HH:MM" or "HH:MM:SS"; combine with jobDate (YYYY-MM-DD) or today
  const [h, m] = deadline.slice(0, 5).split(":").map(Number);
  const base = jobDate ? new Date(jobDate) : new Date();
  base.setHours(h || 0, m || 0, 0, 0);
  const diffMs = base.getTime() - nowTick;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  const text = hrs > 0 ? `${hrs}שע ${rem}ד׳` : `${mins}ד׳`;
  const urgent = !overdue && mins <= 15;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold ring-1 ring-inset",
        overdue
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : urgent
          ? "bg-amber-50 text-amber-800 ring-amber-200 animate-pulse"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Clock className={cn("size-3.5", urgent && !overdue && "animate-pulse")} />
        {overdue ? "חריגה" : "זמן למסירה"}
      </span>
      <span className="font-bold tabular-nums text-[13px]">
        {overdue ? `+${text}` : text}
      </span>
    </div>
  );
}


function TimelineStop({ label, address, extras, done, current, last }: {
  label: string; address?: string | null; extras?: string | null; done: boolean; current: boolean; last?: boolean;
}) {
  return (
    <div className={cn("relative flex items-start gap-3", !last && "pb-3.5")}>
      <div className={cn(
        "z-10 size-3.5 rounded-full mt-1 shrink-0 transition-colors",
        done ? "bg-emerald-500 ring-4 ring-emerald-50"
          : current ? "bg-blue-500 ring-4 ring-blue-100"
          : "bg-white ring-2 ring-slate-200",
      )} />
      <div className="flex-1 min-w-0 text-end">
        <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
        <div className={cn("text-[13px] font-medium truncate", done ? "text-slate-400 line-through" : "text-slate-800")}>
          {address ?? "—"}
        </div>
        {extras && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{extras}</p>}
      </div>
    </div>
  );
}

function SoftBtn({ icon: Icon, label, onClick, tint }: { icon: any; label: string; onClick: () => void; tint: "blue" | "green" | "slate" }) {
  const tints = {
    blue:  "text-blue-600 hover:bg-blue-50/70",
    green: "text-emerald-600 hover:bg-emerald-50/70",
    slate: "text-slate-600 hover:bg-slate-50",
  } as const;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200/70 h-[52px] text-[11px] font-medium bg-white transition-colors",
        tints[tint],
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}

function SoftNavBtn({ label, sublabel, tint, onClick }: { label: string; sublabel?: string; tint: "indigo" | "rose"; onClick: () => void }) {
  const tints = {
    indigo: "text-indigo-700 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50",
    rose:   "text-rose-700 border-rose-100 bg-rose-50/50 hover:bg-rose-50",
  } as const;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "flex items-center justify-center gap-1.5 h-9 rounded-lg border font-medium text-[12px] transition-colors",
        tints[tint],
      )}
    >
      <Navigation className="size-3.5" strokeWidth={1.75} />
      <span className="flex items-baseline gap-1">
        <span>נווט {label}</span>
        {sublabel && <span className="text-[10px] opacity-60 truncate max-w-[70px]">· {sublabel}</span>}
      </span>
    </button>
  );
}




// ============ small building blocks ============
function StageChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
      )}
    >
      <span className={cn(!active && color)}>{label}</span>
      <span className={cn(
        "min-w-[18px] text-center rounded-full px-1.5 py-0.5 text-[10px] font-mono",
        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
      )}>{count}</span>
    </button>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const s = STAGES.find(x => x.key === stage)!;
  const styles: Record<Stage, string> = {
    assigned:   "bg-sky-50 text-sky-700 border-sky-200",
    to_pickup:  "bg-sky-50 text-sky-700 border-sky-200",
    picked_up:  "bg-orange-50 text-orange-800 border-orange-200",
    delivered:  "bg-teal-50 text-teal-700 border-teal-200",
  };

  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-semibold text-[10px] px-1.5 py-0.5", styles[stage])}>
      <Icon className="size-3" /> {s.label}
    </Badge>
  );
}

function DetailBlock({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-end">
      <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
      <div className="font-semibold text-slate-900 truncate">{value}</div>
    </div>
  );
}

function StepBtn({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn("text-xs h-8", active && "bg-emerald-50 text-emerald-700 border-emerald-200")}
    >
      {active && <CheckCircle2 className="size-3" />} {label}
    </Button>
  );
}

function QuickBtn({ icon: Icon, label, onClick, tint }: { icon: any; label: string; onClick: () => void; tint?: "blue" | "indigo" | "rose" | "green" }) {
  const tints: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100 active:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 active:bg-indigo-100",
    rose:   "bg-rose-50 text-rose-700 border-rose-100 active:bg-rose-100",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100 active:bg-emerald-100",
  };
  const cls = tint ? tints[tint] : "bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-100";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("flex flex-col items-center justify-center gap-0.5 rounded-xl border h-14 text-[11px] font-bold transition-colors", cls)}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function getPrimaryAction(stage: Stage, _pickedUp: boolean) {
  switch (stage) {
    case "assigned":
      return {
        label: "יצאתי לאיסוף",
        step: "בדרך לאיסוף",
        icon: Navigation,
        btn: "bg-sky-600 hover:bg-sky-700 active:bg-sky-700",
        shadow: "shadow-[0_2px_10px_-2px_rgba(2,132,199,0.45)]",
      };
    case "to_pickup":
      return {
        label: "אספתי",
        step: "אספתי",
        icon: Package,
        btn: "bg-orange-500 hover:bg-orange-600 active:bg-orange-600",
        shadow: "shadow-[0_2px_10px_-2px_rgba(249,115,22,0.45)]",
      };
    case "picked_up":
      return {
        label: "נמסר ללקוח",
        step: "נמסר",
        icon: CheckCircle2,
        btn: "bg-teal-600 hover:bg-teal-700 active:bg-teal-700",
        shadow: "shadow-[0_2px_10px_-2px_rgba(13,148,136,0.45)]",
      };
    case "delivered":
      return null;
  }
}


function BonDetails({ job }: { job: any }) {
  const dropoffExtras = [
    job.dropoff_building && `בניין ${job.dropoff_building}`,
    job.dropoff_entrance && `כניסה ${job.dropoff_entrance}`,
    job.dropoff_floor && `קומה ${job.dropoff_floor}`,
    job.dropoff_apartment && `דירה ${job.dropoff_apartment}`,
  ].filter(Boolean).join(" · ");

  const deadline = job.delivery_deadline
    ? String(job.delivery_deadline).slice(0, 5)
    : (job.job_time ?? "—");

  return (
    <div className="space-y-3 text-sm">
      {/* Meta strip — granite */}
      <div className="rounded-xl bg-gradient-to-l from-[#0b3b2e] via-[#12604a] to-[#1c8a5b] text-white p-3 grid grid-cols-3 gap-2 text-center shadow-sm">
        <div>
          <div className="text-[10px] text-white/60 font-semibold">תשלום</div>
          <div className="text-[17px] font-extrabold text-[#7dee6c] leading-tight mt-0.5">{Number(job.payment).toFixed(0)} ₪</div>
        </div>
        <div className="border-x border-white/15">
          <div className="text-[10px] text-white/60 font-semibold">סוג</div>
          <div className="text-[12px] font-bold mt-1 truncate px-1">{job.job_type ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/60 font-semibold">מסירה עד</div>
          <div className="text-[15px] font-extrabold mt-0.5 text-amber-200 leading-tight">{deadline}</div>
        </div>
      </div>

      {/* Customer / business */}
      {job.customer_name && (
        <div className="rounded-xl border border-black/10 p-3 text-end bg-white">
          <div className="text-[10.5px] text-slate-500 font-semibold mb-0.5">שולח / עסק</div>
          <div className="font-extrabold text-slate-900 text-[15px]">{job.customer_name}</div>
          {job.job_date && <div className="text-[11px] text-slate-500 mt-0.5">{job.job_date}</div>}
        </div>
      )}

      {/* Pickup */}
      <BonBlock
        badge="איסוף"
        accent="sky"
        icon={MapPin}
        address={job.pickup_address ?? job.pickup_area}
        area={job.pickup_area}
        name={job.pickup_contact_name}
        phone={job.pickup_contact_phone}
        notes={job.pickup_notes}
      />

      {/* Dropoff */}
      <BonBlock
        badge="מסירה"
        accent="rose"
        icon={MapPin}
        address={job.dropoff_address ?? job.dropoff_area}
        area={job.dropoff_area}
        extras={dropoffExtras}
        name={job.recipient_name}
        phone={job.recipient_phone}
        notes={job.dropoff_notes}
      />

      {/* Description / free notes */}
      {job.description && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-end">
          <div className="text-[10.5px] text-amber-800 font-bold mb-1 flex items-center justify-end gap-1">
            <Info className="size-3" /> הערות לשליח
          </div>
          <div className="text-[13px] text-amber-900 whitespace-pre-wrap leading-relaxed">{job.description}</div>
        </div>
      )}
    </div>
  );
}

const BON_ACCENTS = {
  sky:  { chip: "bg-sky-100 text-sky-800",   bar: "bg-sky-500",  icon: "text-sky-600" },
  rose: { chip: "bg-rose-100 text-rose-800", bar: "bg-rose-500", icon: "text-rose-600" },
} as const;

function BonBlock({ badge, accent, icon: Icon, address, area, extras, name, phone, notes }: {
  badge: string; accent: keyof typeof BON_ACCENTS; icon: any;
  address?: string | null; area?: string | null; extras?: string;
  name?: string | null; phone?: string | null; notes?: string | null;
}) {
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  const a = BON_ACCENTS[accent];
  return (
    <div className="relative rounded-xl border border-black/10 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={cn("absolute inset-y-0 right-0 w-1", a.bar)} />
      <div className="pr-3 pl-3 py-3 text-end space-y-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => address && window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`, "_blank")}
            disabled={!address}
            className="h-7 text-[11px] rounded-full bg-slate-100 text-slate-700 px-2.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40 active:bg-slate-200"
          >
            <Navigation className="size-3" /> נווט
          </button>
          <span className={cn("h-6 text-[11px] rounded-full px-2.5 font-bold inline-flex items-center gap-1", a.chip)}>
            <Icon className={cn("size-3", a.icon)} /> {badge}
          </span>
        </div>

        {/* Address */}
        <div>
          <div className="font-extrabold text-slate-900 leading-snug text-[14px]">{address ?? "—"}</div>
          {area && area !== address && <div className="text-[11px] text-slate-500 mt-0.5">{area}</div>}
          {extras && <div className="text-[12px] text-slate-700 font-semibold mt-1">{extras}</div>}
        </div>

        {/* Contact */}
        {(name || phone) && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            {name && <div className="font-semibold text-slate-800 text-[13px]">{name}</div>}
            {phone && (
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href={`tel:${phone}`}
                  className="h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[12px] font-semibold flex items-center justify-center gap-1.5 active:bg-blue-100"
                >
                  <Phone className="size-3.5" /> חייג
                </a>
                <a
                  href={`https://wa.me/${digits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[12px] font-semibold flex items-center justify-center gap-1.5 active:bg-emerald-100"
                >
                  <MessageCircle className="size-3.5" /> וואטסאפ
                </a>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10.5px] text-slate-500 font-semibold mb-1">הערות</div>
            <div className="text-[12.5px] text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed">
              {notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export function ContactBlock({ label, address, name, phone }: { label: string; address?: string | null; name?: string | null; phone?: string | null }) {
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="font-bold">{address ?? "—"}</div>
      {(name || phone) && (
        <div className="mt-2 flex flex-wrap-reverse items-center justify-end gap-2">
          {name && <span className="text-slate-700">{name}</span>}
          {phone && (
            <>
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                <Phone className="size-3" /> {phone}
              </a>
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                <MessageCircle className="size-3" /> וואטסאפ
              </a>
            </>
          )}
        </div>
      )}
      {!name && !phone && (
        <div className="mt-2 text-xs text-slate-400">לא הוזנו פרטי איש קשר</div>
      )}
    </div>
  );
}


// ============ History (compact cards, not table) ============
export function PastJobs() {
  const { data: me } = useMyCourier();

  const { data: outcomes = [] } = useQuery({
    queryKey: ["history-outcomes", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_outcomes")
        .select("id, delivered_at, was_cancelled, was_late, customer_rating, tip_amount, jobs(job_number, job_type, pickup_area, dropoff_area, payment, customer_name, job_date)")
        .eq("courier_id", me!.id)
        .order("delivered_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: declined = [] } = useQuery({
    queryKey: ["history-declined", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_events")
        .select("id, responded_at, response, jobs(job_number, job_type, pickup_area, dropoff_area, payment, job_date)")
        .eq("courier_id", me!.id)
        .in("response", ["declined", "expired", "no_response"])
        .order("responded_at", { ascending: false, nullsFirst: false })
        .limit(100);
      return data ?? [];
    },
  });

  const [tab, setTab] = useState<"done" | "declined">("done");

  if (outcomes.length === 0 && declined.length === 0) {
    return (
      <Card className="rounded-2xl"><CardContent className="py-14 text-center text-slate-500">
        <HistoryIcon className="size-10 mx-auto mb-3 opacity-50" /> אין עבודות בהיסטוריה
      </CardContent></Card>
    );
  }

  // stats
  const doneCount = outcomes.filter((o: any) => o.delivered_at && !o.was_cancelled).length;
  const totalEarned = outcomes.reduce((s: number, o: any) => s + (o.delivered_at && !o.was_cancelled ? Number(o.jobs?.payment ?? 0) : 0), 0);
  const totalTips = outcomes.reduce((s: number, o: any) => s + Number(o.tip_amount ?? 0), 0);
  const avgRating = (() => {
    const rated = outcomes.filter((o: any) => o.customer_rating != null);
    return rated.length ? (rated.reduce((s: number, o: any) => s + Number(o.customer_rating), 0) / rated.length) : null;
  })();

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="הושלמו" value={doneCount} />
        <StatCard label="הרווחת" value={`${totalEarned.toFixed(0)} ₪`} />
        <StatCard label="טיפים" value={`${totalTips.toFixed(0)} ₪`} />
        <StatCard label="דירוג" value={avgRating ? avgRating.toFixed(1) : "—"} icon={avgRating ? <Star className="size-3 fill-amber-400 text-amber-400" /> : undefined} />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("done")}
          className={cn("flex-1 rounded-full px-3 py-2 text-xs font-bold transition", tab === "done" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700")}
        >בוצעו ({outcomes.length})</button>
        <button
          onClick={() => setTab("declined")}
          className={cn("flex-1 rounded-full px-3 py-2 text-xs font-bold transition", tab === "declined" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700")}
        >נדחו / לא נענו ({declined.length})</button>
      </div>

      {tab === "done" && (
        <div className="space-y-2">
          {outcomes.map((o: any) => (
            <Card key={o.id} className="rounded-xl border-slate-200 shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-end shrink-0">
                    <div className="text-base font-extrabold text-[#35AD29] leading-none">{Number(o.jobs?.payment ?? 0).toFixed(0)} ₪</div>
                    {o.tip_amount > 0 && <div className="text-[10px] text-amber-600 font-semibold mt-0.5">+{Number(o.tip_amount).toFixed(0)} טיפ</div>}
                  </div>
                  <div className="flex-1 text-end min-w-0">
                    <div className="flex items-center justify-end gap-2 mb-0.5">
                      {o.was_cancelled ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] gap-1"><XCircle className="size-3" /> בוטלה</Badge>
                      ) : o.delivered_at ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1"><CheckCircle2 className="size-3" /> הושלמה</Badge>
                      ) : <Badge variant="outline" className="text-[10px]">פתוח</Badge>}
                      {o.customer_rating != null && (
                        <span className="flex items-center gap-0.5 text-amber-600 text-[11px] font-bold">
                          <Star className="size-3 fill-amber-400 text-amber-400" />{o.customer_rating}
                        </span>
                      )}
                      {o.was_late && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">איחור</Badge>}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700 min-w-0">
                      <span className="truncate">{o.jobs?.pickup_area ?? "—"}</span>
                      <span className="text-slate-300 shrink-0">←</span>
                      <span className="truncate font-semibold">{o.jobs?.dropoff_area ?? "—"}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {o.delivered_at ? new Date(o.delivered_at).toLocaleDateString("he-IL") : o.jobs?.job_date ?? "—"}
                      {" · "}{o.jobs?.job_type}
                      {o.jobs?.customer_name && <> · {o.jobs.customer_name}</>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "declined" && (
        <div className="space-y-2">
          {declined.length === 0 && (
            <Card className="rounded-xl"><CardContent className="py-8 text-center text-sm text-slate-500">לא דחית/פספסת אף הצעה</CardContent></Card>
          )}
          {declined.map((d: any) => (
            <Card key={d.id} className="rounded-xl border-slate-200 shadow-none opacity-80">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-end shrink-0">
                    <div className="text-base font-bold text-slate-500 leading-none">{Number(d.jobs?.payment ?? 0).toFixed(0)} ₪</div>
                  </div>
                  <div className="flex-1 text-end min-w-0">
                    <div className="flex items-center justify-end gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {d.response === "declined" ? "נדחתה על ידך" : d.response === "expired" ? "פג תוקף" : "ללא תגובה"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-700 min-w-0">
                      <span className="truncate">{d.jobs?.pickup_area ?? "—"}</span>
                      <span className="text-slate-300 shrink-0">←</span>
                      <span className="truncate font-semibold">{d.jobs?.dropoff_area ?? "—"}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {d.responded_at ? new Date(d.responded_at).toLocaleDateString("he-IL") : "—"} · {d.jobs?.job_type}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-none">
      <CardContent className="p-2.5 text-center">
        <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
        <div className="text-sm font-extrabold text-slate-900 flex items-center justify-center gap-1">
          {icon}{value}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryPage() {
  const t = useCourierTerms();
  return (
    <CourierShell title={t.myJobs} subtitle={t.myJobsSub}>
      <Tabs defaultValue="history" dir="rtl" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4 h-11 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="history" className="rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">היסטוריה</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">דוחות</TabsTrigger>
        </TabsList>
        <TabsContent value="history"><PastJobs /></TabsContent>
        <TabsContent value="reports"><CourierReports /></TabsContent>
      </Tabs>
    </CourierShell>
  );
}

