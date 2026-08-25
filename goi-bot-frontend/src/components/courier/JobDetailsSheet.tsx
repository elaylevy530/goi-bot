import type { ReactNode } from "react";
import { Building2, ClipboardList, Home, MessageCircle, Package, Phone, ShoppingBag, User, Wallet, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type JobDetails = {
  job_number?: string | number | null;
  customer_name?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  pickup_notes?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  dropoff_notes?: string | null;
  dropoff_building?: string | null;
  dropoff_entrance?: string | null;
  dropoff_floor?: string | null;
  dropoff_apartment?: string | null;
  package_type?: string | null;
  package_size?: string | null;
  number_of_packages?: number | null;
  item_category?: string | null;
  payment?: string | number | null;
  order_total?: string | number | null;
  cod?: boolean | null;
  cash_on_delivery?: boolean | null;
  collect_cash?: boolean | null;
};

export function JobDetailsSheet({
  job,
  open,
  onOpenChange,
  onChatPickup,
  onChatDropoff,
}: {
  job: JobDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatPickup: () => void;
  onChatDropoff: () => void;
}) {
  if (!job) return null;

  const pickupPhone = job.pickup_contact_phone;
  const dropoffPhone = job.recipient_phone;
  const building = [
    job.dropoff_entrance && `כניסה ${job.dropoff_entrance}`,
    job.dropoff_floor && `קומה ${job.dropoff_floor}`,
    job.dropoff_apartment && `דירה ${job.dropoff_apartment}`,
    job.dropoff_building && `בניין ${job.dropoff_building}`,
  ].filter(Boolean).join(", ");

  const packageBits = [
    job.package_type,
    job.package_size,
    job.number_of_packages ? (Number(job.number_of_packages) > 1 ? `${job.number_of_packages} חבילות` : "חבילה אחת") : null,
    job.item_category,
  ].filter(Boolean);

  const cash = !!(job.cod || job.cash_on_delivery || job.collect_cash);
  const amount = Number(job.order_total ?? job.payment ?? 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        dir="rtl"
        className="max-h-[92vh] rounded-t-3xl border-border bg-surface p-0"
      >
        <DrawerHeader className="relative px-5 pb-3 pt-1 text-center">
          <DrawerClose
            className="absolute left-4 top-0 grid size-11 place-items-center rounded-pill text-text-strong active:bg-muted"
            aria-label="סגור"
          >
            <X className="size-5" />
          </DrawerClose>
          <DrawerTitle className="text-lg font-extrabold text-text-strong">פרטי משלוח</DrawerTitle>
          <DrawerDescription className="font-mono text-xs text-text-muted">
            {job.job_number ? `#${job.job_number}` : ""}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <StopCard
            tone="pickup"
            title="איסוף"
            icon={<ShoppingBag className="size-4" />}
            name={job.customer_name || job.pickup_contact_name || "נקודת איסוף"}
            address={job.pickup_address || job.pickup_area}
            contactName={job.pickup_contact_name}
            contactPhone={pickupPhone}
            notes={job.pickup_notes}
            notesLabel="הערות לאיסוף"
            onChat={onChatPickup}
            onCall={pickupPhone ? () => { window.location.href = `tel:${pickupPhone}`; } : undefined}
          />

          <StopCard
            tone="dropoff"
            title="מסירה"
            icon={<Home className="size-4" />}
            name={job.recipient_name || "נקודת מסירה"}
            address={job.dropoff_address || job.dropoff_area}
            contactName={job.recipient_name}
            contactPhone={dropoffPhone}
            notes={job.dropoff_notes}
            notesLabel="הערות למסירה"
            building={building}
            onChat={onChatDropoff}
            onCall={dropoffPhone ? () => { window.location.href = `tel:${dropoffPhone}`; } : undefined}
          />

          {packageBits.length > 0 && (
            <div className="flex items-start gap-2 rounded-card border border-border bg-surface px-3 py-3">
              <Package className="mt-0.5 size-4 shrink-0 text-text-subtle" aria-hidden />
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-text-subtle">פרטי המשלוח</p>
                <p className="mt-0.5 text-sm font-semibold text-text-strong">{packageBits.join(" | ")}</p>
              </div>
            </div>
          )}

          <div className={cn("flex items-center gap-3 rounded-card px-3 py-3", cash ? "bg-primary-soft" : "border border-border bg-muted")}>
            <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground">
              <Wallet className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs font-bold text-text-subtle">תשלום</p>
              <p className="text-sm font-semibold text-text-strong">
                {cash ? "עסקת מזומן — יש לגבות מהלקוח" : "תשלום דרך האפליקציה"}
              </p>
            </div>
            <p className="shrink-0 text-lg font-black tabular-nums text-primary">₪ {Number.isFinite(amount) ? amount.toFixed(0) : "0"}</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StopCard({
  tone,
  title,
  icon,
  name,
  address,
  contactName,
  contactPhone,
  notes,
  notesLabel,
  building,
  onChat,
  onCall,
}: {
  tone: "pickup" | "dropoff";
  title: string;
  icon: ReactNode;
  name?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  notesLabel: string;
  building?: string;
  onChat: () => void;
  onCall?: () => void;
}) {
  const isPickup = tone === "pickup";
  return (
    <section className="rounded-card border border-border bg-surface p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn("grid size-9 place-items-center rounded-pill", isPickup ? "bg-info-bg text-info" : "bg-primary-soft text-primary")}>
            {icon}
          </div>
          <p className={cn("text-sm font-extrabold", isPickup ? "text-info" : "text-primary")}>{title}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <RoundAction label="צ'אט" icon={<MessageCircle className="size-4" />} onClick={onChat} tone={tone} />
          <RoundAction label="התקשר" icon={<Phone className="size-4" />} onClick={onCall} tone={tone} disabled={!onCall} />
        </div>
      </div>

      <div className="mt-3 text-right">
        <p className="text-sm font-extrabold text-text-strong">{name || "—"}</p>
        <p className="mt-0.5 text-sm text-text-subtle">{address || "—"}</p>
      </div>

      {(contactName || contactPhone) && (
        <div className="mt-3 flex items-center gap-2 rounded-card border border-border px-3 py-2">
          <div className={cn("grid size-8 place-items-center rounded-pill", isPickup ? "bg-info-bg text-info" : "bg-primary-soft text-primary")}>
            <User className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold text-text-strong">{contactName || "איש קשר"}</p>
            {contactPhone && <p className="text-xs text-text-subtle" dir="ltr">{contactPhone}</p>}
          </div>
        </div>
      )}

      {building && (
        <div className="mt-2 flex items-start gap-2 text-sm text-text">
          <Building2 className="mt-0.5 size-4 shrink-0 text-text-subtle" aria-hidden />
          <div>
            <p className="text-xs font-bold text-text-subtle">כניסה / קומה / דירה</p>
            <p className="font-semibold">{building}</p>
          </div>
        </div>
      )}

      {notes && (
        <div className="mt-2 flex items-start gap-2 text-sm text-text">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-text-subtle" aria-hidden />
          <div>
            <p className="text-xs font-bold text-text-subtle">{notesLabel}</p>
            <p className="leading-relaxed">{notes}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function RoundAction({
  label,
  icon,
  onClick,
  tone,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  tone: "pickup" | "dropoff";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-pill border bg-surface px-2.5 text-[10px] font-bold disabled:opacity-40",
        tone === "pickup" ? "border-info/30 text-info" : "border-primary/30 text-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
