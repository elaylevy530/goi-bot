import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { JobDetailsSheet } from "@/components/courier/JobDetailsSheet";
import {
  nestListCourierActiveJobs, nestCourierUpdateProgress, nestListJobStatusLogs,
} from "@/lib/nest-jobs";
import { jobBusinessPhone, resolveCourierBusinessConversation } from "@/lib/nest-chat";
import { nestListMyCourierOutcomes } from "@/lib/nest-domain";
import {
  CheckCircle2, ChevronDown, Clock, Filter, History as HistoryIcon,
  Info, MapPin, MessageCircle, Navigation, Package, Phone, Star, Truck, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BusinessLogo } from "@/components/BusinessLogo";
import { openWaze } from "@/lib/waze";


export const Route = createFileRoute("/courier/history")({
  beforeLoad: () => {
    throw redirect({ to: "/courier/performance" });
  },
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

type ActiveTab = "today" | "scheduled";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isScheduledActiveJob(job: { job_date?: string | null }) {
  const date = job.job_date ? String(job.job_date).slice(0, 10) : "";
  return !!date && date > todayYmd();
}

// ============ ActiveJobs (Today / Scheduled + compact expandable cards) ============
export function ActiveJobs() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [contactJob, setContactJob] = useState<any>(null);
  const [tab, setTab] = useState<ActiveTab>("today");
  const [statusFilter, setStatusFilter] = useState<"all" | Stage>("all");


  const { data: jobs = [] } = useQuery({
    queryKey: ["active-jobs", me?.id],
    enabled: !!me?.id,
    refetchInterval: 15_000,
    queryFn: () => nestListCourierActiveJobs(),
  });

  const { data: lastSteps = {} } = useQuery({
    queryKey: ["active-job-steps", jobs.map((j) => j.id).join(",")],
    enabled: jobs.length > 0,
    refetchInterval: 10_000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      for (const j of jobs) {
        const logs = await nestListJobStatusLogs(j.id);
        const latest = logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        if (latest) map[j.id] = latest.new_status;
      }
      return map;
    },
  });

  const setStep = useMutation({
    mutationFn: async ({ job_id, step }: { job_id: string; step: string }) => {
      await nestCourierUpdateProgress(job_id, step);
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
    onSuccess: (_d, v) => {
      toast.success("הסטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-job-steps"] });
      qc.invalidateQueries({ queryKey: ["courier-active-count"] });
      if (v.step === "נמסר") {
        qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        qc.invalidateQueries({ queryKey: ["chat-start-active-jobs"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const openNav = (addr?: string | null) => openWaze(addr);

  const todayJobs = useMemo(() => jobs.filter((j) => !isScheduledActiveJob(j)), [jobs]);
  const scheduledJobs = useMemo(() => jobs.filter((j) => isScheduledActiveJob(j)), [jobs]);
  const visible = tab === "today" ? todayJobs : scheduledJobs;

  const openBusinessChat = async (j: any) => {
    try {
      const id = await resolveCourierBusinessConversation({
        id: j.id,
        conversation_id: j.conversation_id,
        customer_id: j.customer_id,
        selected_courier_id: j.selected_courier_id ?? me?.id,
      });
      navigate({ to: "/courier/messages", search: { c: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פתיחת צ׳אט נכשלה");
    }
  };

  const callBusiness = (j: any) => {
    const p = jobBusinessPhone(j);
    if (p) window.location.href = `tel:${p}`;
    else toast.error("אין מספר עסק");
  };

  const tabs: { key: ActiveTab; label: string; count: number }[] = [
    { key: "today", label: "היום", count: todayJobs.length },
    { key: "scheduled", label: "מתוזמנות", count: scheduledJobs.length },
  ];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return visible;
    return visible.filter((j) => stageOf(j, (lastSteps as Record<string, string>)[j.id]) === statusFilter);
  }, [visible, statusFilter, lastSteps]);

  return (
    <div className="space-y-3">
      <div className="flex w-full border-b border-border">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={cn(
              "relative flex-1 min-h-11 px-2 text-sm text-center transition-colors",
              tab === tabItem.key
                ? "font-extrabold text-primary"
                : "font-semibold text-text-subtle",
            )}
          >
            {tabItem.label}
            {tab === tabItem.key && (
              <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-pill bg-primary" />
            )}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="active-status-filter">סינון לפי סטטוס</label>
      <div className="relative">
        <Filter className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary" aria-hidden />
        <select
          id="active-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Stage)}
          className="min-h-12 w-full appearance-none rounded-card border border-border bg-surface px-10 py-3 text-right text-sm font-semibold text-text-strong shadow-card"
        >
          <option value="all">סינון לפי סטטוס</option>
          <option value="assigned">אושר</option>
          <option value="to_pickup">בדרך לאיסוף</option>
          <option value="picked_up">נאסף</option>
        </select>
        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
      </div>

      {jobs.length > 0 && (
        <div className="flex items-end justify-between px-1">
          <div className="text-sm text-text-subtle">{jobs.length} משלוחים בביצוע</div>
          <div className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-bold text-success-text">משמרת פעילה</div>
        </div>
      )}

      {filtered.length === 0 && (
        <ActiveEmptyState
          hasJobsInTab={visible.length > 0}
          tab={tab}
        />
      )}

      {filtered.map((j) => {
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
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-2 text-slate-600 text-[12px] font-medium py-2 hover:text-slate-800 transition-colors">
                    <ChevronDown className="size-4" />
                    יצירת קשר ופרטים
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <SoftBtn
                      icon={MessageCircle}
                      label="צ׳אט עסק"
                      tint="green"
                      onClick={() => { void openBusinessChat(j); }}
                    />
                    <SoftBtn
                      icon={Phone}
                      label="התקשר לעסק"
                      tint="blue"
                      onClick={() => callBusiness(j)}
                    />
                    <SoftBtn
                      icon={Phone}
                      label="התקשר ללקוח"
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

      <JobDetailsSheet
        job={contactJob}
        open={!!contactJob}
        onOpenChange={(o) => { if (!o) setContactJob(null); }}
        onChatPickup={() => { if (contactJob) void openBusinessChat(contactJob); }}
        onChatDropoff={() => {
          const phone = contactJob?.recipient_phone ? String(contactJob.recipient_phone).replace(/\D/g, "") : "";
          if (phone) window.open(`https://wa.me/${phone}`, "_blank", "noreferrer");
          else toast.error("אין מספר לקוח");
        }}
      />
    </div>
  );
}

function ActiveEmptyState({ hasJobsInTab, tab }: { hasJobsInTab: boolean; tab: ActiveTab }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <ActiveEmptyArt />
      <h2 className="mt-5 text-lg font-extrabold text-text-strong">
        {hasJobsInTab
          ? "אין משלוחים בסטטוס הזה"
          : tab === "scheduled"
            ? "אין משלוחים מתוזמנים"
            : "אין משלוחים פעילים כרגע"}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-text-subtle">
        {hasJobsInTab
          ? "נסו לבחור סטטוס אחר או לחזור לכל המשלוחים"
          : "כשתהיה לך משלוח חדש, הוא יופיע כאן"}
      </p>
    </div>
  );
}

function ActiveEmptyArt() {
  return (
    <svg viewBox="0 0 220 140" className="h-36 w-56" aria-hidden>
      <rect x="18" y="78" width="184" height="8" rx="4" className="fill-muted" />
      <path d="M28 78h18l8-22h20l-6 22h24l10-30h22l-8 30h30l12-36h20l-10 36h28" className="fill-border-strong/70" />
      <circle cx="78" cy="52" r="16" className="fill-primary" />
      <path d="M78 40c-7 0-12 5-12 12 0 9 12 22 12 22s12-13 12-22c0-7-5-12-12-12zm0 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" className="fill-primary-foreground" />
      <path d="M86 68c10 8 22 14 34 16" className="stroke-primary fill-none" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="118" y="78" width="52" height="38" rx="6" className="fill-surface stroke-border" strokeWidth="2" />
      <rect x="118" y="78" width="52" height="10" rx="4" className="fill-primary" />
      <path d="M130 100h28M130 108h16" className="stroke-text-muted" strokeWidth="2" />
    </svg>
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
        "flex items-center justify-center gap-1.5 min-h-11 rounded-lg border font-medium text-[12px] transition-colors",
        tints[tint],
      )}
    >
      <Navigation className="size-3.5" strokeWidth={1.75} />
      <span className="flex items-baseline gap-1">
        <span>{label}</span>
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
            onClick={() => openWaze(address)}
            disabled={!address}
            className="h-7 text-[11px] rounded-full bg-slate-100 text-slate-700 px-2.5 font-semibold inline-flex items-center gap-1 disabled:opacity-40 active:bg-slate-200"
          >
            <Navigation className="size-3" /> נווט בוויז
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
    <div className="rounded-xl border border-border p-3 bg-surface text-start">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="font-bold">{address ?? "—"}</div>
      {(name || phone) && (
        <div className="mt-2 flex flex-wrap items-center justify-start gap-2">
          {name && <span className="text-text">{name}</span>}
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
        <div className="mt-2 text-xs text-text-muted">לא הוזנו פרטי איש קשר</div>
      )}
    </div>
  );
}


// ============ History (Figma delivery-history-v2) ============

type HistoryFilter = "all" | "completed" | "cancelled";

type HistoryRow = {
  id: string;
  status: "completed" | "cancelled";
  at: Date | null;
  pickup: string;
  dropoff: string;
  netProfit: number | null;
};

function formatHistoryWhen(at: Date | null): string {
  if (!at || Number.isNaN(at.getTime())) return "—";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const dayDiff = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);
  const time = at.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (dayDiff === 0) return `היום, ${time}`;
  if (dayDiff === 1) return `אתמול, ${time}`;
  const date = at.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  return `${date}, ${time}`;
}

export function PastJobs() {
  const { data: me } = useMyCourier();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const { data: outcomes = [], isLoading } = useQuery({
    queryKey: ["history-outcomes", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60_000,
    queryFn: () => nestListMyCourierOutcomes(),
  });

  const rows: HistoryRow[] = useMemo(() => {
    return (outcomes as any[])
      .map((o) => {
        const cancelled = !!o.was_cancelled;
        const completed = !!o.delivered_at && !cancelled;
        if (!completed && !cancelled) return null;
        const atRaw = o.delivered_at || o.cancelled_at || o.created_at || o.jobs?.job_date;
        const at = atRaw ? new Date(atRaw) : null;
        const payment = Number(o.jobs?.payment ?? 0);
        const tip = Number(o.tip_amount ?? 0);
        return {
          id: String(o.id),
          status: cancelled ? ("cancelled" as const) : ("completed" as const),
          at,
          pickup: String(o.jobs?.pickup_address ?? o.jobs?.pickup_area ?? "—"),
          dropoff: String(o.jobs?.dropoff_address ?? o.jobs?.dropoff_area ?? "—"),
          netProfit: cancelled ? null : payment + tip,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.at?.getTime() ?? 0) - (a!.at?.getTime() ?? 0)) as HistoryRow[];
  }, [outcomes]);

  const visible = useMemo(() => {
    if (filter === "completed") return rows.filter((r) => r.status === "completed");
    if (filter === "cancelled") return rows.filter((r) => r.status === "cancelled");
    return rows;
  }, [rows, filter]);

  const tabs: { key: HistoryFilter; label: string }[] = [
    { key: "cancelled", label: "בוטלו" },
    { key: "completed", label: "הושלמו" },
    { key: "all", label: "הכל" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full rounded-[14px] bg-border-strong/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex-1 min-h-11 rounded-[10px] px-2 py-2.5 text-[13px] text-center transition-all",
              filter === tab.key
                ? "bg-surface font-bold text-primary shadow-card"
                : "font-semibold text-text-subtle",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-text-muted text-sm">טוען…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-14 text-center text-text-muted">
          <HistoryIcon className="size-10 mx-auto mb-3 opacity-50" />
          אין עבודות בהיסטוריה
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 text-[11px] font-semibold",
                    row.status === "completed"
                      ? "bg-success-bg text-success-text"
                      : "bg-danger-bg text-danger-text",
                  )}
                >
                  {row.status === "completed" ? "הושלם" : "בוטל"}
                </span>
                <span className="text-xs text-text-subtle">{formatHistoryWhen(row.at)}</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[13px] text-text-subtle text-right leading-snug">
                    {row.pickup}
                  </p>
                  <span className="size-1.5 rounded-full bg-primary shrink-0" aria-hidden />
                </div>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[13px] text-text-subtle text-right leading-snug">
                    {row.dropoff}
                  </p>
                  <span className="size-1.5 rounded-full bg-primary/40 shrink-0" aria-hidden />
                </div>
              </div>

              {row.netProfit != null && (
                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <p className="text-[15px] font-bold text-text-strong">
                    ₪ {row.netProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-text-subtle">רווח נקי</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


