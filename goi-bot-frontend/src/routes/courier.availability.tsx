import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  Loader2,
} from "lucide-react";
import { CourierBellButton, CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Switch } from "@/components/ui/switch";
import {
  CarIcon,
  ElectricBikeIcon,
  ScooterIcon,
  WorkAreaRegionIcon,
} from "@/components/courier/work-area-visuals";
import { WorkAreaCityPicker } from "@/components/courier/WorkAreaPicker";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { LIVE_JOB_OFFLINE_ERROR, courierHasLiveActiveJob } from "@/lib/courier-session";
import {
  composeWorkingAreas,
  expandWorkAreasForCards,
  filterCitiesToWorkAreas,
  splitWorkingAreas,
  toggleWorkArea,
  workAreaSelectionError,
  WORK_AREA_CARDS,
} from "@/lib/regions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/availability")({
  head: () => ({ meta: [{ title: "אזורי עבודה — Goi" }] }),
  component: AvailabilityPage,
});

type VehicleChoice = "רכב" | "קטנוע" | "אופניים חשמליים" | "";

const VEHICLE_OPTIONS = [
  { value: "רכב", label: "רכב", Icon: CarIcon },
  { value: "קטנוע", label: "קטנוע", Icon: ScooterIcon },
  { value: "אופניים חשמליים", label: "אופניים חשמליים", Icon: ElectricBikeIcon },
] as const;

function normalizeVehicle(value: string | null | undefined): VehicleChoice {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (v === "קטנוע" || v === "רכב" || v === "אופניים חשמליים") return v;
  if (/אופניים\s*חשמלי|e-?bike|ebike/i.test(v)) return "אופניים חשמליים";
  if (/קטנוע|אופנוע|קורקינט/.test(v)) return "קטנוע";
  if (/אופניים/.test(v)) return "אופניים חשמליים";
  if (/רכב|טנדר|משאית|אוטו/.test(v)) return "רכב";
  return "";
}

function SectionLabel({
  step,
  title,
  subtitle,
}: {
  step?: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3 text-right">
      {step != null && (
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-black text-primary-foreground shadow-sm shadow-primary/25">
          {step}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-extrabold leading-tight text-text-strong">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-snug text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function AvailabilityPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [areas, setAreas] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState<VehicleChoice>("");
  const [areasError, setAreasError] = useState<string | null>(null);

  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const accepting = approved && me?.accepting_jobs !== false;
  const liveJobLocksOffline = courierHasLiveActiveJob(me);

  useEffect(() => {
    if (!me) return;
    const row = me as { working_areas?: string[] | null; vehicle_type?: string | null };
    setAreas(expandWorkAreasForCards(row.working_areas));
    setCities(splitWorkingAreas(row.working_areas).legacy);
    setVehicle(normalizeVehicle(row.vehicle_type));
    setAreasError(null);
  }, [me]);

  const selectedAreaLabels = WORK_AREA_CARDS
    .filter((card) => areas.includes(card.stored))
    .map((card) => card.label);

  const toggleArea = (stored: string) => {
    const next = toggleWorkArea(areas, stored);
    setAreas(next);
    setCities((prev) => filterCitiesToWorkAreas(prev, next));
    setAreasError(null);
  };

  const toggleAvailability = useMutation({
    mutationFn: async (next: boolean) => {
      if (!next && liveJobLocksOffline) {
        throw new Error(LIVE_JOB_OFFLINE_ERROR);
      }
      await nestUpdateMyCourier({ accepting_jobs: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message || "לא הצלחנו לעדכן זמינות"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const err = workAreaSelectionError(areas, cities);
      if (err) {
        setAreasError(err);
        throw new Error(err);
      }
      const payload: Record<string, unknown> = {
        working_areas: areas.length > 0 ? composeWorkingAreas(areas, cities) : cities,
      };
      if (vehicle) payload.vehicle_type = vehicle;
      await nestUpdateMyCourier(payload);
    },
    onSuccess: () => {
      toast.success("ההגדרות נשמרו");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F3F6F4]">
        <header className="relative z-20 shrink-0 border-b border-black/5 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-lg font-extrabold leading-tight text-text-strong">אזורי עבודה</h1>
              <p className="mt-0.5 text-[11px] font-semibold text-text-muted">התאם הצעות לפי כלי ואזור</p>
            </div>
            <CourierBellButton className="size-11 border-0 bg-[#F3F6F4] shadow-none" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            {/* Availability */}
            <section
              className={cn(
                "rounded-[1.35rem] border px-4 py-3.5 shadow-sm transition-colors",
                accepting
                  ? "border-primary/25 bg-gradient-to-l from-primary-soft via-white to-white"
                  : "border-black/5 bg-white",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors",
                    accepting ? "bg-primary-deep text-white shadow-md" : "bg-[#F3F6F4] text-text-muted",
                  )}
                  aria-hidden
                >
                  <Check className="size-5" strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-[15px] font-extrabold text-text-strong">זמין לקבל עבודות</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                        accepting ? "bg-primary/15 text-[#1f7a1a]" : "bg-black/5 text-text-muted",
                      )}
                    >
                      {accepting ? "פעיל" : "כבוי"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-text-muted">
                    {!approved
                      ? "הזמינות תיפתח אחרי אישור החשבון"
                      : liveJobLocksOffline && accepting
                        ? "יש משלוח פעיל — לא ניתן לעבור למצב לא זמין"
                        : "כשהמתג דולק תקבל הצעות משלוח בזמן אמת"}
                  </p>
                </div>
                <Switch
                  checked={accepting}
                  disabled={!approved || toggleAvailability.isPending || (accepting && liveJobLocksOffline)}
                  onCheckedChange={(next) => {
                    if (!next && liveJobLocksOffline) {
                      toast.error(LIVE_JOB_OFFLINE_ERROR);
                      return;
                    }
                    toggleAvailability.mutate(next);
                  }}
                  aria-label="זמין לקבל עבודות"
                  className="h-8 w-[3.25rem] shrink-0 data-[state=checked]:bg-primary-deep [&>span]:size-7 [&>span]:data-[state=checked]:translate-x-[1.35rem]"
                />
              </div>
            </section>

            {/* Settings sheet */}
            <section className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-sm">
              <div className="space-y-5 p-4">
                <div>
                  <SectionLabel
                    step={1}
                    title="סוג כלי התחבורה שלך"
                    subtitle="נתאים לך משלוחים שמתאימים לכלי"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {VEHICLE_OPTIONS.map((option) => {
                      const on = vehicle === option.value;
                      const Icon = option.Icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setVehicle(option.value)}
                          className={cn(
                            "relative flex min-h-[6.25rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all active:scale-[0.98]",
                            on
                              ? "border-primary bg-primary-soft shadow-[inset_0_0_0_1px_rgba(53,173,41,0.25)]"
                              : "border-black/5 bg-[#F7F8F7] hover:border-primary/30",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-2 left-2 grid size-5 place-items-center rounded-full transition-colors",
                              on ? "bg-primary-deep text-white" : "border border-black/10 bg-white",
                            )}
                            aria-hidden
                          >
                            {on && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              "grid size-12 place-items-center rounded-2xl",
                              on ? "bg-white text-primary shadow-sm" : "bg-white/70 text-text-strong",
                            )}
                          >
                            <Icon className="size-8" />
                          </span>
                          <span className="text-center text-[11px] font-extrabold leading-tight text-text-strong">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-black/5" />

                <div>
                  <SectionLabel
                    step={2}
                    title="אזורי עבודה"
                    subtitle="אפשר כמה אזורים. בכל אזור בוחרים את הערים שבהן עובדים"
                  />
                  {selectedAreaLabels.length > 0 && (
                    <div className="mb-3 flex flex-wrap justify-end gap-1.5">
                      {selectedAreaLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-[#1f7a1a]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {WORK_AREA_CARDS.map((card) => {
                      const on = areas.includes(card.stored);
                      return (
                        <button
                          key={card.stored}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleArea(card.stored)}
                          className={cn(
                            "relative flex min-h-[6.75rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all active:scale-[0.98]",
                            on
                              ? "border-primary bg-primary-soft shadow-[inset_0_0_0_1px_rgba(53,173,41,0.25)]"
                              : "border-black/5 bg-[#F7F8F7] hover:border-primary/30",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full",
                              on ? "bg-primary-deep text-white" : "border border-black/10 bg-white",
                            )}
                            aria-hidden
                          >
                            {on && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <WorkAreaRegionIcon
                            mapId={card.mapId}
                            className={cn("size-8", on ? "text-primary" : "text-text-muted")}
                          />
                          <span className="text-sm font-extrabold text-text-strong">{card.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {areas.length > 0 && (
                    <div className="mt-3">
                      <WorkAreaCityPicker
                        regions={areas}
                        selected={cities}
                        onChange={(next) => {
                          setCities(next);
                          if (next.length > 0) setAreasError(null);
                        }}
                      />
                    </div>
                  )}

                  {cities.length > 0 && areas.length === 0 && (
                    <p className="mt-2 text-right text-xs text-text-subtle">
                      נשמרו ערים ישנות: {cities.join(", ")} — בחר אזור כדי לעדכן
                    </p>
                  )}
                  {areasError && (
                    <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-right text-xs font-bold text-destructive">
                      {areasError}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Tip */}
            <section className="flex items-start gap-3 rounded-[1.25rem] border border-primary/15 bg-primary-soft/70 px-3.5 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                <Bot className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-right">
                <h2 className="text-sm font-extrabold text-text-strong">איך זה עובד?</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
                  Goi ישלח לך הצעות לפי האזורים והערים שבחרת, כלי התחבורה והמיקום שלך בזמן אמת.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#F3F6F4] via-[#F3F6F4]/95 to-transparent px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-8">
          <div className="pointer-events-auto mx-auto max-w-lg">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-deep text-[15px] font-extrabold text-white shadow-fab transition active:scale-[0.99] disabled:opacity-60"
            >
              {save.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Check className="size-5" strokeWidth={3} />
              )}
              שמור הגדרות
            </button>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}
