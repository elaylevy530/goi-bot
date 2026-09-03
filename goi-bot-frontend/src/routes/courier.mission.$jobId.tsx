import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CourierShell } from "@/components/CourierShell";
import { SwipeConfirm } from "@/components/courier/SwipeConfirm";
import { nestCourierUpdateProgress, nestGetJob, nestListJobStatusLogs } from "@/lib/nest-jobs";
import { jobBusinessPhone, resolveCourierBusinessConversation } from "@/lib/nest-chat";
import {
  ArrowLeft, ArrowRight, ArrowUp, Camera, Check, CheckCircle2, CornerUpLeft, CornerUpRight,
  MessageCircle, Navigation, Phone, PhoneCall, TriangleAlert, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openWaze } from "@/lib/waze";
import { MissionNavMap, type MissionRouteInfo, type MissionStop } from "@/components/courier/MissionNavMap";

type MissionUiStage =
  | "accepted"
  | "to_pickup"
  | "at_pickup"
  | "en_route"
  | "confirm"
  | "complete";

export const Route = createFileRoute("/courier/mission/$jobId")({
  head: () => ({ meta: [{ title: "משלוח פעיל — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { stage?: MissionUiStage } => ({
    stage: typeof s.stage === "string" ? (s.stage as MissionUiStage) : undefined,
  }),
  component: MissionPage,
});

type BackendStage = "assigned" | "to_pickup" | "picked_up" | "delivered";

function backendStageOf(job: any, currentStep?: string): BackendStage {
  const outcome = Array.isArray(job?.job_outcomes) ? job.job_outcomes[0] : job?.job_outcomes;
  if (outcome?.delivered_at || currentStep === "נמסר") return "delivered";
  if (
    outcome?.picked_up_at ||
    currentStep === "אספתי" ||
    currentStep === "נאסף" ||
    currentStep === "בדרך למסירה"
  ) return "picked_up";
  if (currentStep === "בדרך לאיסוף" || currentStep === "הגעתי לאיסוף") return "to_pickup";
  return "assigned";
}

function MissionPage() {
  const { jobId } = Route.useParams();
  const { stage: stageFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [uiStage, setUiStage] = useState<MissionUiStage>(stageFromSearch || "accepted");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");

  const { data: job, isLoading } = useQuery({
    queryKey: ["mission-job", jobId],
    refetchInterval: 12_000,
    queryFn: () => nestGetJob(jobId),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["mission-job-steps", jobId],
    enabled: !!jobId,
    refetchInterval: 10_000,
    queryFn: () => nestListJobStatusLogs(jobId),
  });

  const latestStep = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted[0]?.new_status as string | undefined;
  }, [logs]);

  const backend = job ? backendStageOf(job, latestStep) : "assigned";

  useEffect(() => {
    if (stageFromSearch) {
      setUiStage(stageFromSearch);
      return;
    }
    if (backend === "delivered") setUiStage("complete");
    else if (backend === "picked_up") setUiStage("en_route");
    else if (backend === "to_pickup") setUiStage("to_pickup");
    else if (backend === "assigned") setUiStage((s) => (s === "accepted" ? "accepted" : "accepted"));
  }, [backend, stageFromSearch]);

  const setStep = useMutation({
    mutationFn: async (step: string) => {
      await nestCourierUpdateProgress(jobId, step);
      const statusMap: Record<string, string> = {
        "בדרך לאיסוף": "heading_to_pickup",
        "אספתי": "picked_up",
        "נמסר": "delivered",
      };
      const status = statusMap[step];
      if (status) {
        try {
          const { notifyBusinessJobStatusFn } = await import("@/lib/business-status-push.functions");
          void notifyBusinessJobStatusFn({ data: { jobId, status } });
        } catch {}
        try {
          const { notifyCustomerJobStatusFn } = await import("@/lib/customer-status-push.functions");
          void notifyCustomerJobStatusFn({ data: { jobId, status } });
        } catch {}
      }
    },
    onSuccess: (_d, step) => {
      qc.invalidateQueries({ queryKey: ["mission-job", jobId] });
      qc.invalidateQueries({ queryKey: ["mission-job-steps", jobId] });
      qc.invalidateQueries({ queryKey: ["active-jobs"] });
      qc.invalidateQueries({ queryKey: ["active-job-steps"] });
      qc.invalidateQueries({ queryKey: ["courier-active-count"] });
      if (step === "נמסר") {
        qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        qc.invalidateQueries({ queryKey: ["chat-start-active-jobs"] });
      }
      if (step === "בדרך לאיסוף") setUiStage("to_pickup");
      if (step === "אספתי") setUiStage("en_route");
      if (step === "נמסר") setUiStage("complete");
      toast.success("הסטטוס עודכן");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !job) {
    return (
      <CourierShell fullBleed>
        <div className="flex-1 grid place-items-center bg-bg text-text-muted">טוען משלוח…</div>
      </CourierShell>
    );
  }

  const openBusinessChat = async () => {
    try {
      const id = await resolveCourierBusinessConversation({
        id: job.id,
        conversation_id: (job as { conversation_id?: string | null }).conversation_id,
        customer_id: job.customer_id,
        selected_courier_id: job.selected_courier_id,
      });
      navigate({ to: "/courier/messages", search: { c: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פתיחת צ׳אט נכשלה");
    }
  };

  const callBusiness = () => {
    const p = jobBusinessPhone(job);
    if (p) window.location.href = `tel:${p}`;
    else toast.error("אין מספר עסק");
  };

  const pickup = String(job.pickup_address ?? job.pickup_area ?? "—");
  const dropoff = String(job.dropoff_address ?? job.dropoff_area ?? "—");
  const pickupStop: MissionStop = {
    address: pickup,
    lat: (job as { pickup_lat?: number | null }).pickup_lat,
    lng: (job as { pickup_lng?: number | null }).pickup_lng,
  };
  const dropoffStop: MissionStop = {
    address: dropoff,
    lat: (job as { dropoff_lat?: number | null }).dropoff_lat,
    lng: (job as { dropoff_lng?: number | null }).dropoff_lng,
  };
  const storeName = String(job.customer_name ?? "עסק");
  const recipient = String(job.recipient_name ?? "לקוח");
  const payment = Number(job.payment ?? 0);
  const tip = Number((job as any).job_outcomes?.[0]?.tip_amount ?? 0);
  const itemsLabel = String(
    (job as any).item_category ||
      (job as any).package_type ||
      job.job_type ||
      "משלוח",
  );
  const description = String(job.description ?? "").trim();
  const itemLines = description
    ? description.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 6)
    : [itemsLabel];

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-bg">
        {uiStage === "accepted" && (
          <AcceptedStage
            jobNumber={job.job_number}
            storeName={storeName}
            pickup={pickup}
            dropoff={dropoff}
            pickupStop={pickupStop}
            dropoffStop={dropoffStop}
            payment={payment}
            onChatBusiness={() => { void openBusinessChat(); }}
            onCallBusiness={callBusiness}
            onStart={() => setStep.mutate("בדרך לאיסוף")}
            onStartWaze={() => {
              openWaze(pickup);
              setStep.mutate("בדרך לאיסוף");
            }}
            pending={setStep.isPending}
          />
        )}

        {uiStage === "to_pickup" && (
          <ActiveNavStage
            stepLabel="השלב הבא: איסוף"
            name={storeName}
            subtitle={itemsLabel}
            address={pickup}
            destination={pickupStop}
            destinationKind="pickup"
            stepperActive={0}
            swipeLabel="החלק לאישור הגעה"
            ctaLabel="הגעתי לנקודת האיסוף"
            wazeLabel="נווט לאיסוף בוויז"
            onSwipeOrCta={() => setUiStage("at_pickup")}
            onNavigate={() => openWaze(pickup)}
            onChatBusiness={() => { void openBusinessChat(); }}
            onCallBusiness={callBusiness}
            pending={setStep.isPending}
          />
        )}

        {uiStage === "at_pickup" && (
          <AtPickupStage
            storeName={storeName}
            address={pickup}
            phone={jobBusinessPhone(job)}
            items={itemLines}
            notes={description || null}
            checked={checkedItems}
            onToggle={(i) => setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }))}
            onChatBusiness={() => { void openBusinessChat(); }}
            onCallBusiness={callBusiness}
            onComplete={() => setStep.mutate("אספתי")}
            pending={setStep.isPending}
          />
        )}

        {uiStage === "en_route" && (
          <EnRouteStage
            recipient={recipient}
            address={dropoff}
            destination={dropoffStop}
            onArrived={() => setUiStage("confirm")}
            onNavigate={() => openWaze(dropoff)}
            onCall={() => {
              if (job.recipient_phone) window.location.href = `tel:${job.recipient_phone}`;
              else toast.error("אין מספר לקוח");
            }}
            onMessage={() => {
              const p = String(job.recipient_phone ?? "").replace(/\D/g, "");
              if (!p) return toast.error("אין מספר לקוח");
              window.open(`https://wa.me/${p}`, "_blank");
            }}
            onChatBusiness={() => { void openBusinessChat(); }}
            onCallBusiness={callBusiness}
          />
        )}

        {uiStage === "confirm" && (
          <ConfirmDeliveryStage
            recipient={recipient}
            itemsLabel={itemsLabel}
            address={dropoff}
            floorApt={[
              job.dropoff_floor && `קומה ${job.dropoff_floor}`,
              job.dropoff_apartment && `דירה ${job.dropoff_apartment}`,
            ].filter(Boolean).join(", ")}
            leaveAtDoor={leaveAtDoor}
            onLeaveAtDoor={setLeaveAtDoor}
            note={deliveryNote}
            onNote={setDeliveryNote}
            onConfirm={() => setStep.mutate("נמסר")}
            pending={setStep.isPending}
          />
        )}

        {uiStage === "complete" && (
          <CompleteStage
            payment={payment}
            tip={tip}
            onMap={() => navigate({ to: "/courier/new-jobs" })}
            onSummary={() => navigate({ to: "/courier/performance" })}
          />
        )}
      </div>
    </CourierShell>
  );
}

function formatRouteDistance(route: MissionRouteInfo | null) {
  if (!route) return null;
  if (route.nextDistanceM != null && route.nextDistanceM < 1000) {
    return `${Math.max(10, Math.round(route.nextDistanceM / 10) * 10)} מ׳`;
  }
  return `${route.distanceKm} ק״מ`;
}

function ManeuverIcon({ maneuver }: { maneuver?: string | null }) {
  const m = (maneuver ?? "").toLowerCase();
  const Icon =
    m.includes("left") && m.includes("sharp") ? Undo2
    : m.includes("left") ? (m.includes("slight") ? CornerUpLeft : ArrowLeft)
    : m.includes("right") && m.includes("sharp") ? Undo2
    : m.includes("right") ? (m.includes("slight") ? CornerUpRight : ArrowRight)
    : ArrowUp;
  return (
    <span className="size-11 rounded-xl bg-primary-foreground/15 grid place-items-center shrink-0">
      <Icon className="size-6" strokeWidth={2.4} />
    </span>
  );
}

function NavBanner({
  fallbackTitle, name, address, route,
}: {
  fallbackTitle: string; name: string; address: string; route: MissionRouteInfo | null;
}) {
  const dist = formatRouteDistance(route);
  return (
    <div className="rounded-2xl bg-map-nav-banner text-primary-foreground shadow-card-strong overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <ManeuverIcon maneuver={route?.maneuver} />
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-extrabold leading-snug">
            {route?.nextInstruction || fallbackTitle}
          </p>
          <p className="text-xs text-primary-foreground/75 mt-0.5 tabular-nums">
            {route
              ? [dist, `${route.durationMin} דק׳`].filter(Boolean).join(" · ")
              : "מחשב מסלול…"}
          </p>
        </div>
      </div>
      <div className="px-4 py-2.5 bg-surface text-text-strong text-right">
        <p className="text-sm font-bold truncate">{name}</p>
        <p className="text-xs text-text-subtle truncate">{address}</p>
      </div>
    </div>
  );
}

function BusinessContactRow({
  onChat, onCall,
}: {
  onChat: () => void; onCall: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onChat}
        className="min-h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-semibold"
      >
        צ׳אט עסק <MessageCircle className="size-4 text-primary" />
      </button>
      <button
        type="button"
        onClick={onCall}
        className="min-h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-semibold"
      >
        התקשר לעסק <PhoneCall className="size-4 text-primary" />
      </button>
    </div>
  );
}

function AcceptedStage({
  jobNumber, storeName, pickup, dropoff, pickupStop, dropoffStop, payment, onStart, onStartWaze, onChatBusiness, onCallBusiness, pending,
}: {
  jobNumber?: string; storeName: string; pickup: string; dropoff: string;
  pickupStop: MissionStop; dropoffStop: MissionStop;
  payment: number; onStart: () => void; onStartWaze: () => void;
  onChatBusiness: () => void; onCallBusiness: () => void; pending?: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] flex flex-col items-center text-center gap-3">
        <div className="size-[72px] rounded-full bg-primary-soft grid place-items-center text-primary mt-2">
          <Check className="size-9" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-text-strong">המשלוח שלך! 🎉</h1>
        <p className="text-sm text-text-subtle">ההזמנה שויכה אליך בהצלחה. סע בבטחה.</p>
      </div>

      <div className="mx-5 mt-6 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-text-subtle">
            הזמנה #{jobNumber ?? "—"}
          </span>
          <p className="text-base font-bold text-text-strong truncate">{storeName}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-text-subtle text-right">איסוף: {pickup}</p>
            <span className="size-2.5 rounded-full bg-primary shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-text-subtle text-right">מסירה: {dropoff}</p>
            <span className="size-2.5 rounded-full bg-primary/40 shrink-0" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted px-3 py-2.5 text-center">
            <p className="text-base font-bold text-text-strong">₪{payment.toFixed(2)}</p>
            <p className="text-[11px] text-text-subtle mt-0.5">רווח משוער</p>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2.5 text-center">
            <p className="text-base font-bold text-text-strong">—</p>
            <p className="text-[11px] text-text-subtle mt-0.5">זמן הגעה משוער</p>
          </div>
        </div>
        <div className="mt-3">
          <BusinessContactRow onChat={onChatBusiness} onCall={onCallBusiness} />
        </div>
      </div>

      <div className="mx-5 mt-4 h-44 rounded-2xl overflow-hidden border border-border">
        <MissionNavMap
          mode="preview"
          destination={pickupStop}
          destinationKind="pickup"
          otherStop={dropoffStop}
          className="size-full"
        />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <button
          type="button"
          disabled={pending}
          onClick={onStart}
          className="w-full min-h-[51px] rounded-xl bg-primary-deep text-primary-foreground font-bold text-[15px] disabled:opacity-60"
        >
          התחל ניווט במפה
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onStartWaze}
          className="w-full min-h-11 rounded-xl border border-border font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Navigation className="size-4 text-primary" /> נווט לאיסוף בוויז
        </button>
      </div>
    </div>
  );
}

function Stepper({ active }: { active: 0 | 1 | 2 }) {
  const steps = [
    { key: 2, label: "נמסר" },
    { key: 1, label: "בדרך" },
    { key: 0, label: "איסוף" },
  ];
  return (
    <div className="flex items-start justify-between px-4">
      {steps.map((s, i) => {
        const done = active > s.key || (active === s.key);
        const current = active === s.key;
        return (
          <div key={s.label} className="contents">
            {i > 0 && (
              <div className={cn("flex-1 h-0.5 mt-3 mx-1 rounded-full", active >= s.key ? "bg-primary" : "bg-border")} />
            )}
            <div className="flex flex-col items-center gap-1.5 w-12">
              <span
                className={cn(
                  "size-6 rounded-full border-2 grid place-items-center",
                  current || done ? "bg-primary border-primary text-primary-foreground" : "border-border bg-surface",
                )}
              >
                {(current || (done && active > s.key)) && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn("text-[11px] font-semibold", current ? "text-primary" : "text-text-subtle")}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveNavStage({
  stepLabel, name, subtitle, address, destination, destinationKind, stepperActive, swipeLabel, ctaLabel, wazeLabel, onSwipeOrCta, onNavigate, onChatBusiness, onCallBusiness, pending,
}: {
  stepLabel: string; name: string; subtitle: string; address: string;
  destination: MissionStop; destinationKind: "pickup" | "dropoff";
  stepperActive: 0 | 1 | 2; swipeLabel: string; ctaLabel: string; wazeLabel: string;
  onSwipeOrCta: () => void; onNavigate: () => void; onChatBusiness: () => void; onCallBusiness: () => void; pending?: boolean;
}) {
  const [route, setRoute] = useState<MissionRouteInfo | null>(null);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative flex-1 min-h-[45%]">
        <MissionNavMap
          mode="navigate"
          destination={destination}
          destinationKind={destinationKind}
          className="absolute inset-0"
          onRoute={setRoute}
        />
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-4 z-10">
          <NavBanner fallbackTitle={stepLabel} name={name} address={address} route={route} />
          {subtitle && (
            <p className="sr-only">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="rounded-t-3xl bg-surface border-t border-border px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 shadow-card-strong">
        <Stepper active={stepperActive} />
        <button
          type="button"
          onClick={onNavigate}
          className="w-full min-h-11 rounded-xl border border-border font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Navigation className="size-4 text-primary" /> {wazeLabel}
        </button>
        <BusinessContactRow onChat={onChatBusiness} onCall={onCallBusiness} />
        <SwipeConfirm label={swipeLabel} onConfirm={onSwipeOrCta} disabled={pending} />
        <button
          type="button"
          disabled={pending}
          onClick={onSwipeOrCta}
          className="w-full min-h-[51px] rounded-xl border border-border bg-surface font-bold text-[15px] text-text-strong active:bg-muted"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function AtPickupStage({
  storeName, address, phone, items, notes, checked, onToggle, onChatBusiness, onCallBusiness, onComplete, pending,
}: {
  storeName: string; address: string; phone?: string | null;
  items: string[]; notes?: string | null;
  checked: Record<number, boolean>; onToggle: (i: number) => void;
  onChatBusiness: () => void; onCallBusiness: () => void;
  onComplete: () => void; pending?: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] flex items-start justify-between gap-3">
        <button
          type="button"
          aria-label="התקשר לעסק"
          onClick={onCallBusiness}
          className="size-10 rounded-full bg-surface border border-border grid place-items-center text-primary"
        >
          <PhoneCall className="size-[18px]" />
        </button>
        <div className="text-right min-w-0">
          <p className="text-base font-bold text-text-strong truncate">איסוף: {storeName}</p>
          <p className="text-xs text-text-subtle truncate">{address}</p>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl border border-border bg-surface p-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0"
            onClick={onCallBusiness}
            aria-label="התקשר לעסק"
          >
            <Phone className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-bold text-text-strong truncate">{storeName}</p>
            <p className="text-xs text-text-subtle">טלפון ליצירת קשר: {phone || "—"}</p>
          </div>
        </div>
        <BusinessContactRow onChat={onChatBusiness} onCall={onCallBusiness} />
      </div>

      <p className="px-5 mt-5 text-sm font-bold text-text-strong text-right">פריטים לאימות הזמנה</p>
      <div className="mx-5 mt-2 rounded-2xl border border-border bg-surface overflow-hidden">
        {items.map((item, i) => (
          <button
            key={`${item}-${i}`}
            type="button"
            onClick={() => onToggle(i)}
            className="w-full flex items-center gap-3 px-3.5 py-3.5 border-b border-border last:border-0 text-right"
          >
            <span
              className={cn(
                "size-[22px] rounded-md border grid place-items-center shrink-0",
                checked[i] ? "bg-primary border-primary text-primary-foreground" : "border-border bg-surface",
              )}
            >
              {checked[i] && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="flex-1 text-sm font-semibold text-text-strong">{item.startsWith("1x") ? item : `1x ${item}`}</span>
          </button>
        ))}
      </div>

      {notes && (
        <div className="mx-5 mt-3 rounded-2xl border border-warning/30 bg-warning-bg p-3.5 text-right">
          <div className="flex items-center justify-end gap-1.5 text-warning-text text-xs font-bold">
            <span>הערות להזמנה</span>
            <TriangleAlert className="size-3.5" />
          </div>
          <p className="mt-1 text-sm text-text-strong">{notes}</p>
        </div>
      )}

      <button
        type="button"
        className="mx-5 mt-3 rounded-2xl border border-dashed border-border bg-surface py-5 flex flex-col items-center gap-2 text-text-subtle"
        onClick={() => toast.message("צילום אופציונלי — בקרוב")}
      >
        <Camera className="size-6 text-primary" />
        <span className="text-xs font-semibold">צלם את ההזמנה (אופציונלי לאימות)</span>
      </button>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={pending}
          onClick={onComplete}
          className="w-full min-h-[51px] rounded-xl bg-primary-deep text-primary-foreground font-bold text-[15px] disabled:opacity-60"
        >
          אספתי את ההזמנה 📦
        </button>
      </div>
    </div>
  );
}

function EnRouteStage({
  recipient, address, destination, onArrived, onNavigate, onCall, onMessage, onChatBusiness, onCallBusiness,
}: {
  recipient: string; address: string; destination: MissionStop;
  onArrived: () => void; onNavigate: () => void; onCall: () => void; onMessage: () => void;
  onChatBusiness: () => void; onCallBusiness: () => void;
}) {
  const [route, setRoute] = useState<MissionRouteInfo | null>(null);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="relative flex-1 min-h-[50%]">
        <MissionNavMap
          mode="navigate"
          destination={destination}
          destinationKind="dropoff"
          className="absolute inset-0"
          onRoute={setRoute}
        />
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-4 z-10">
          <NavBanner fallbackTitle="בדרך למסירה" name={recipient} address={address} route={route} />
        </div>
      </div>

      <div className="rounded-t-3xl bg-surface border-t border-border px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
        <button
          type="button"
          onClick={onNavigate}
          className="w-full min-h-11 rounded-xl border border-border font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Navigation className="size-4 text-primary" /> נווט למסירה בוויז
        </button>
        <BusinessContactRow onChat={onChatBusiness} onCall={onCallBusiness} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onMessage} className="min-h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-semibold">
            שליחת הודעה <MessageCircle className="size-4 text-primary" />
          </button>
          <button type="button" onClick={onCall} className="min-h-11 rounded-xl border border-border flex items-center justify-center gap-2 text-sm font-semibold">
            התקשר ללקוח <PhoneCall className="size-4 text-primary" />
          </button>
        </div>
        <button
          type="button"
          onClick={onArrived}
          className="w-full min-h-[51px] rounded-xl bg-primary-deep text-primary-foreground font-bold text-[15px]"
        >
          הגעתי ללקוח 📍
        </button>
        <button type="button" className="w-full text-center text-xs text-text-subtle py-1" onClick={() => toast.message("דיווח בעיה — פנו לתמיכה")}>
          דיווח על בעיה במשלוח
        </button>
      </div>
    </div>
  );
}

function ConfirmDeliveryStage({
  recipient, itemsLabel, address, floorApt, leaveAtDoor, onLeaveAtDoor, note, onNote, onConfirm, pending,
}: {
  recipient: string; itemsLabel: string; address: string; floorApt: string;
  leaveAtDoor: boolean; onLeaveAtDoor: (v: boolean) => void;
  note: string; onNote: (v: string) => void;
  onConfirm: () => void; pending?: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] text-right">
        <h1 className="text-xl font-bold text-text-strong">מסירת המשלוח 📦</h1>
        <p className="text-xs text-text-subtle mt-1">אנא אמת את פרטי המסירה מול הלקוח</p>
      </div>

      <div className="mx-5 mt-4 rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-subtle">{itemsLabel}</span>
          <span className="text-base font-bold text-text-strong">{recipient}</span>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between gap-2 text-sm text-text-subtle">
          <span>{floorApt || "—"}</span>
          <span>{address}</span>
        </div>
      </div>

      <div className="mx-5 mt-4 flex rounded-[14px] bg-muted p-1">
        <button
          type="button"
          onClick={() => onLeaveAtDoor(true)}
          className={cn("flex-1 min-h-10 rounded-[10px] text-sm font-semibold", leaveAtDoor ? "bg-surface text-primary shadow-card font-bold" : "text-text-subtle")}
        >
          השאר בדלת
        </button>
        <button
          type="button"
          onClick={() => onLeaveAtDoor(false)}
          className={cn("flex-1 min-h-10 rounded-[10px] text-sm font-semibold", !leaveAtDoor ? "bg-surface text-primary shadow-card font-bold" : "text-text-subtle")}
        >
          מסירה ללקוח
        </button>
      </div>

      <button
        type="button"
        onClick={() => toast.message("צילום הוכחת מסירה — בקרוב")}
        className="mx-5 mt-4 rounded-2xl border border-dashed border-border bg-surface py-8 flex flex-col items-center gap-2"
      >
        <span className="size-12 rounded-full bg-primary-soft text-primary grid place-items-center">
          <Camera className="size-6" />
        </span>
        <span className="text-sm font-bold text-text-strong">צלם הוכחת מסירה</span>
        <span className="text-xs text-text-subtle">מומלץ במיוחד בעת השארה ליד הדלת</span>
      </button>

      <div className="mx-5 mt-3 rounded-2xl border border-border bg-surface p-3">
        <p className="text-xs text-text-subtle text-right mb-2">חתימת הלקוח (אופציונלי)</p>
        <div className="h-14 rounded-xl bg-muted border border-dashed border-border" />
      </div>

      <input
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="הערות למסירה (לדוגמה: הושאר בארון חשמל)"
        className="mx-5 mt-3 min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-right outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="w-full min-h-[51px] rounded-xl bg-primary-deep text-primary-foreground font-bold text-[15px] disabled:opacity-60"
        >
          אשר מסירה ✔️
        </button>
      </div>
    </div>
  );
}

function CompleteStage({
  payment, tip, onMap, onSummary,
}: {
  payment: number; tip: number; onMap: () => void; onSummary: () => void;
}) {
  const total = payment + tip;
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] flex flex-col items-center text-center gap-2">
        <div className="size-20 rounded-full bg-primary-soft grid place-items-center text-primary">
          <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <CheckCircle2 className="size-7" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-strong mt-2">המשלוח הושלם! 🎉</h1>
        <p className="text-sm text-text-subtle">עבודה מצוינת! הרווח נוסף ליתרה שלך.</p>
      </div>

      <div className="mx-5 mt-6 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="text-center">
          <p className="text-4xl font-extrabold text-primary">₪{total.toFixed(2)}</p>
          <p className="text-xs text-text-subtle mt-1">סך הכל רווח מהמשלוח</p>
        </div>
        <div className="mt-4 border-t border-border pt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="font-bold">₪{payment.toFixed(2)}</span><span className="text-text-subtle">תעריף בסיס</span></div>
          {tip > 0 && (
            <div className="flex justify-between"><span className="font-bold">₪{tip.toFixed(2)}</span><span className="text-text-subtle">טיפ מהלקוח</span></div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-bg/95 backdrop-blur border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <button type="button" onClick={onMap} className="w-full min-h-[51px] rounded-xl bg-primary-deep text-primary-foreground font-bold text-[15px]">
          חזור למפת משלוחים
        </button>
        <button type="button" onClick={onSummary} className="w-full min-h-11 rounded-xl border border-border font-semibold text-sm">
          הצג סיכום יומי
        </button>
      </div>
    </div>
  );
}
