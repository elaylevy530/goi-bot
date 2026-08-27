import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Headphones, Loader2, Mail, MapPin, MessageCircle, MessageSquare } from "lucide-react";
import { CourierBellButton, CourierMenuButton } from "@/components/CourierSideDrawer";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Switch } from "@/components/ui/switch";
import {
  CarIcon,
  IsraelWorkAreasMap,
  ScooterIcon,
  WorkAreaRegionIcon,
} from "@/components/courier/work-area-visuals";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import {
  expandWorkAreasForCards,
  splitWorkingAreas,
  toggleWorkArea,
  WORK_AREA_CARDS,
  WORK_AREA_REQUIRED_ERROR,
} from "@/lib/regions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/availability")({
  head: () => ({ meta: [{ title: "אזור עבודה ותמיכה — Goi" }] }),
  component: AvailabilityPage,
});

const SUPPORT_WHATSAPP =
  "https://wa.me/972500000000?text=" + encodeURIComponent("שלום, אני צריך עזרה באזור השליחים של Goi");
const SUPPORT_EMAIL = "support@goi.co.il";

const VEHICLE_OPTIONS = [
  { value: "רכב", label: "רכב", Icon: CarIcon },
  { value: "קטנוע", label: "קטנוע", Icon: ScooterIcon },
] as const;

function normalizeVehicle(value: string | null | undefined): "קטנוע" | "רכב" | "" {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (v === "קטנוע" || v === "רכב") return v;
  if (/קטנוע|אופנוע|אופניים|קורקינט/.test(v)) return "קטנוע";
  if (/רכב|טנדר|משאית|אוטו/.test(v)) return "רכב";
  return "";
}

function AvailabilityPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const [areas, setAreas] = useState<string[]>([]);
  const [legacyAreas, setLegacyAreas] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState<"קטנוע" | "רכב" | "">("");
  const [areasError, setAreasError] = useState<string | null>(null);

  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const accepting = approved && me?.accepting_jobs !== false;

  useEffect(() => {
    if (!me) return;
    const row = me as { working_areas?: string[] | null; vehicle_type?: string | null };
    const split = splitWorkingAreas(row.working_areas);
    setAreas(expandWorkAreasForCards(row.working_areas));
    setLegacyAreas(split.legacy);
    setVehicle(normalizeVehicle(row.vehicle_type));
    setAreasError(null);
  }, [me]);

  const toggleArea = (stored: string) => {
    const next = toggleWorkArea(areas, stored);
    setAreas(next);
    if (next.length > 0) {
      setLegacyAreas([]);
      setAreasError(null);
    }
  };

  const toggleAvailability = useMutation({
    mutationFn: async (next: boolean) => {
      await nestUpdateMyCourier({ accepting_jobs: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message || "לא הצלחנו לעדכן זמינות"),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (areas.length === 0 && legacyAreas.length === 0) {
        setAreasError(WORK_AREA_REQUIRED_ERROR);
        throw new Error(WORK_AREA_REQUIRED_ERROR);
      }
      const payload: Record<string, unknown> = {
        working_areas: areas.length > 0 ? areas : legacyAreas,
      };
      if (vehicle) payload.vehicle_type = vehicle;
      await nestUpdateMyCourier(payload);
    },
    onSuccess: () => {
      toast.success("האזורים נשמרו ✓");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell fullBleed>
      <div dir="rtl" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
        <header className="shrink-0 border-b border-border bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <CourierMenuButton className="size-11 border-0 shadow-card" />
            <h1 className="min-w-0 flex-1 text-center text-lg font-extrabold leading-tight text-text-strong">
              אזור עבודה ותמיכה
            </h1>
            <CourierBellButton className="size-11 border-0 shadow-card" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          <div className="mx-auto flex max-w-lg flex-col gap-5">
            <section className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-4 shadow-card">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  accepting ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted",
                )}
                aria-hidden
              >
                <Check className="size-5" strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-base font-extrabold text-text-strong">זמין לקבל עבודות</p>
                <p className="mt-0.5 text-xs leading-snug text-text-muted">
                  {approved
                    ? "כשמתג פעיל תקבל הצעות למשלוחים"
                    : "זמינות תיפתח אחרי אישור החשבון"}
                </p>
              </div>
              <Switch
                checked={accepting}
                disabled={!approved || toggleAvailability.isPending}
                onCheckedChange={(next) => toggleAvailability.mutate(next)}
                aria-label="זמין לקבל עבודות"
                className="h-8 w-14 shrink-0 data-[state=checked]:bg-primary [&>span]:size-7 [&>span]:data-[state=checked]:translate-x-5"
              />
            </section>

            <section className="space-y-3">
              <div className="text-right">
                <h2 className="text-base font-extrabold text-text-strong">סוג הרכב שלך</h2>
                <p className="mt-0.5 text-xs text-text-muted">זה עוזר לנו להתאים עבורך את המשלוחים הנכונים</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                        "relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border-2 px-3 py-4 transition-colors",
                        on
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-2 left-2 grid size-5 place-items-center rounded-full",
                          on ? "bg-primary text-primary-foreground" : "border-2 border-border bg-surface",
                        )}
                        aria-hidden
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <Icon className={cn("size-9", on ? "text-primary" : "text-text-strong")} />
                      <span className="text-sm font-extrabold text-text-strong">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-right">
                <h2 className="flex items-center gap-1.5 text-base font-extrabold text-text-strong">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  אזורי עבודה
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">בחר את האזורים בהם תרצה לקבל משלוחים</p>
              </div>
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
                        "relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border-2 px-2 py-3 transition-colors",
                        on
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full",
                          on ? "bg-primary text-primary-foreground" : "border-2 border-border bg-surface",
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
              {legacyAreas.length > 0 && areas.length === 0 && (
                <p className="text-xs text-text-subtle text-right">
                  נשמרו ערים ישנות: {legacyAreas.join(", ")} — בחר אזור מהרשימה כדי לעדכן
                </p>
              )}
              {areasError && <p className="text-xs text-destructive text-right">{areasError}</p>}
            </section>

            <IsraelWorkAreasMap selected={areas} onToggle={toggleArea} />

            <section className="flex items-start gap-3 rounded-card bg-muted px-4 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-right">
                <h2 className="text-sm font-extrabold text-text-strong">איך זה עובד?</h2>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  האלגוריתם שלנו ישלח לך הצעות רלוונטיות לפי האזורים שבחרת, סוג הרכב שלך ומיקום בזמן אמת.
                </p>
              </div>
            </section>

            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-primary text-base font-extrabold text-primary-foreground shadow-fab transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
            >
              {save.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Check className="size-5" strokeWidth={3} />
              )}
              שמור אזורים
            </button>

            <section className="space-y-3">
              <div className="text-right">
                <h2 className="flex items-center gap-1.5 text-base font-extrabold text-text-strong">
                  <Headphones className="size-4 text-primary" aria-hidden />
                  תמיכה
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  שאלה, תקלה או עזרה בחשבון — אפשר לפנות אלינו בכל אחת מהדרכים האלה.
                </p>
              </div>
              <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                <Link
                  to="/courier/messages"
                  className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-3 text-right transition-colors hover:bg-muted active:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-text-strong">צ׳אט עם Goi</span>
                    <span className="block text-xs text-text-muted">פנייה מתוך האפליקציה</span>
                  </span>
                </Link>
                <a
                  href={SUPPORT_WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-3 text-right transition-colors hover:bg-muted active:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <MessageSquare className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-text-strong">וואטסאפ</span>
                    <span className="block text-xs text-text-muted">שיחה ישירה עם התמיכה</span>
                  </span>
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex min-h-12 items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted active:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Mail className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-text-strong">{SUPPORT_EMAIL}</span>
                    <span className="block text-xs text-text-muted">נחזור אליכם במייל</span>
                  </span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}
