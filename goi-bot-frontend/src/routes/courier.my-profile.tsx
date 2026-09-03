import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  User,
  Star,
  MapPin,
  Calendar,
  CheckCircle2,
  Shield,
  Car,
  FileText,
  Headphones,
  ChevronLeft,
  Pen,
  Loader2,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCourierTerms } from "@/lib/courier-kind";
import { useCourierAvatarUrl } from "@/hooks/useCourierAvatarUrl";
import { useMyCourierLiveStats } from "@/hooks/useMyCourierLiveStats";
import {
  nestListMyCourierDocuments,
  type NestCourierDocument,
} from "@/lib/nest-accounts";
import { nestSignedFileUrlResolved } from "@/lib/nest-files";
import {
  type CourierSelfRow,
  COURIER_DOCUMENT_TYPES,
  courierActiveStatus,
  courierInitials,
  displayOrDash,
  formatCourierWorkAreas,
} from "@/lib/courier-session";
import {
  AvatarCameraButton,
  DocumentsInlineEditor,
  OsekInlineEditor,
  PersonalInlineEditor,
  VehicleInlineEditor,
} from "@/components/courier/ProfileInlineEditors";

type ProfileSection = "personal" | "vehicle" | "docs" | "osek";

export const Route = createFileRoute("/courier/my-profile")({
  head: () => ({ meta: [{ title: "הפרופיל שלי — Goi" }] }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const terms = useCourierTerms();
  const { data: meRaw, isPending } = useMyCourier();
  const me = meRaw as CourierSelfRow | null | undefined;
  const [editing, setEditing] = useState<ProfileSection | null>(null);
  const toggle = (section: ProfileSection) =>
    setEditing((prev) => (prev === section ? null : section));
  const { data: avatarUrl } = useCourierAvatarUrl(me?.id, me?.avatar_url);
  const stats = useMyCourierLiveStats(me?.id);
  const { data: documents = [] } = useQuery({
    queryKey: ["my-courier-documents", me?.id],
    enabled: !!me?.id,
    queryFn: nestListMyCourierDocuments,
  });
  const status = courierActiveStatus(me, terms.worker);
  const workAreas = formatCourierWorkAreas(me);
  const verified = me?.bank_details_verified === true;
  const name = me?.full_name?.trim() || "—";

  if (isPending) {
    return (
      <CourierShell title="הפרופיל שלי" subtitle="">
        <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="size-5 animate-spin" />
          טוען…
        </div>
      </CourierShell>
    );
  }

  if (!me) {
    return (
      <CourierShell title="הפרופיל שלי" subtitle="">
        <p className="py-16 text-center text-sm text-slate-500">לא נמצא פרופיל שליח</p>
      </CourierShell>
    );
  }

  return (
    <CourierShell title="הפרופיל שלי" subtitle="">
      <div className="pb-6 space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-primary-deep p-6 text-primary-foreground shadow-card-strong">
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="size-24 overflow-hidden rounded-full border-4 border-primary-foreground/25 bg-primary-foreground/10">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-primary-foreground">
                        {courierInitials(me.full_name)}
                      </div>
                    )}
                  </div>
                  <AvatarCameraButton />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    GO!
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-primary-foreground">{name}</h2>
                    {verified && (
                      <CheckCircle2 className="size-5 fill-primary-foreground text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold",
                      status.available
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-black/25 text-primary-foreground/80",
                    )}
                  >
                    • {status.label}
                  </span>
                </div>
              </div>

              {verified && (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-3">
                  <Shield className="size-8 text-primary-foreground" />
                  <div className="text-center">
                    <div className="text-xs font-semibold text-primary-foreground">החשבון מאומת</div>
                    <div className="text-[10px] text-primary-foreground/70">פרטי בנק</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <Calendar className="mb-2 size-5 text-primary-foreground/90" />
                <div className="mb-1 text-xs text-primary-foreground/70">שליחויות החודש</div>
                <div className="font-bold text-primary-foreground">
                  {stats.isLoading ? "—" : stats.deliveriesThisMonth} {stats.monthLabel}
                </div>
              </div>

              <div className="flex flex-col items-center border-x border-primary-foreground/15 text-center">
                <Star className="mb-2 size-5 fill-yellow-400 text-yellow-400" />
                <div className="mb-1 text-3xl font-bold text-primary-foreground">
                  {stats.isLoading
                    ? "—"
                    : stats.avgRating != null
                      ? stats.avgRating.toFixed(1)
                      : "—"}
                </div>
                <div className="text-xs text-primary-foreground/70">
                  {stats.isLoading
                    ? ""
                    : stats.ratingCount > 0
                      ? `(${stats.ratingCount} דירוגים)`
                      : "(אין דירוגים עדיין)"}
                </div>
                <Link
                  to="/courier/ratings"
                  className="mt-1 flex items-center gap-1 text-xs text-primary-foreground"
                >
                  לכל הדירוגים
                  <ChevronLeft className="size-3" />
                </Link>
              </div>

              <div className="flex flex-col items-center text-center">
                <MapPin className="mb-2 size-5 text-primary-foreground/90" />
                <div className="mb-1 text-xs text-primary-foreground/70">אזורי עבודה</div>
                <div className="font-bold text-primary-foreground">{workAreas ?? "טרם הוזן"}</div>
                <Link
                  to="/courier/availability"
                  className="mt-1 flex items-center gap-1 text-xs text-primary-foreground"
                >
                  לניהול אזורים
                  <ChevronLeft className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <User className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטים אישיים</h3>
            </div>
            <EditToggle
              open={editing === "personal"}
              label="עריכה"
              onClick={() => toggle("personal")}
            />
          </div>
          <Card className="p-0 overflow-hidden">
            {editing === "personal" ? (
              <PersonalInlineEditor me={me} onDone={() => setEditing(null)} />
            ) : (
              <div className="divide-y divide-slate-100">
                <DetailRow icon={Phone} label="טלפון" value={displayOrDash(me.whatsapp_phone)} />
                <DetailRow icon={Mail} label="אימייל" value={displayOrDash(me.email)} />
                <DetailRow icon={User} label="שם מלא" value={displayOrDash(me.full_name)} />
                {me.id_number?.trim() ? (
                  <DetailRow icon={Hash} label="תעודת זהות" value={me.id_number.trim()} />
                ) : null}
                {me.courier_number?.trim() ? (
                  <DetailRow icon={Hash} label="מספר שליח" value={me.courier_number.trim()} />
                ) : null}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי רכב</h3>
            </div>
            <EditToggle
              open={editing === "vehicle"}
              label="עריכת פרטי הרכב"
              onClick={() => toggle("vehicle")}
            />
          </div>
          <Card className="p-0 overflow-hidden">
            {editing === "vehicle" ? (
              <VehicleInlineEditor me={me} onDone={() => setEditing(null)} />
            ) : (
              <div className="p-4">
                <VehicleGrid me={me} onAdd={() => setEditing("vehicle")} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">מסמכים ואישורים</h3>
            </div>
            <EditToggle
              open={editing === "docs"}
              label="עדכון מסמכים"
              onClick={() => toggle("docs")}
            />
          </div>
          <Card className="p-0 overflow-hidden">
            {editing === "docs" ? (
              <DocumentsInlineEditor courierId={me.id} onDone={() => setEditing(null)} />
            ) : (
              <div className="p-4">
                <DocumentsGrid
                  documents={documents}
                  onAdd={() => setEditing("docs")}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי עוסק</h3>
            </div>
            <EditToggle
              open={editing === "osek"}
              label="עריכת פרטים"
              onClick={() => toggle("osek")}
            />
          </div>
          <Card className="p-0 overflow-hidden">
            {editing === "osek" ? (
              <OsekInlineEditor me={me} onDone={() => setEditing(null)} />
            ) : (
              <div className="p-4">
                <OsekBlock me={me} onAdd={() => setEditing("osek")} />
              </div>
            )}
          </Card>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChevronLeft className="size-6 text-slate-400" />
              <div className="size-14 bg-green-100 rounded-full flex items-center justify-center">
                <Headphones className="size-7 text-green-600" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 mb-1">זקוק לעזרה?</div>
                <div className="text-sm text-slate-600">צוות התמיכה שלנו כאן במיוחד</div>
              </div>
            </div>
            <Button
              asChild
              className="bg-primary-deep hover:bg-primary-deep/90 text-white font-bold px-6 py-6 text-base rounded-xl"
            >
              <Link to="/courier/messages">פנה לתמיכה</Link>
            </Button>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function EditToggle({
  open,
  label,
  onClick,
}: {
  open: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-green-600 text-sm font-semibold flex items-center gap-1"
    >
      <Pen className="size-4" />
      {open ? "ביטול" : label}
    </button>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
          <Icon className="size-5 text-green-600" />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">{label}</div>
          <div className="text-sm font-semibold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({
  action,
  onAction,
}: {
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="text-center space-y-2">
      <p className="text-sm text-slate-500">טרם הוזן</p>
      <button
        type="button"
        onClick={onAction}
        className="text-green-600 text-sm font-semibold inline-flex items-center gap-1"
      >
        {action}
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}

function VehicleGrid({
  me,
  onAdd,
}: {
  me: CourierSelfRow;
  onAdd: () => void;
}) {
  const cells = [
    { label: "סוג רכב", value: me.vehicle_type },
    { label: "מספר רישוי", value: me.vehicle_plate },
  ].filter((cell) => cell.value?.toString().trim());

  if (cells.length === 0) {
    return <EmptyHint action="הוספת פרטי רכב" onAction={onAdd} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 text-center">
      {cells.map((cell) => (
        <div key={cell.label}>
          <div className="text-xs text-slate-500 mb-1">{cell.label}</div>
          <div className="text-sm font-bold text-slate-900">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}

function formatDocExpiry(raw?: string | Date | null) {
  if (!raw) return null;
  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("he-IL");
}

function DocumentsGrid({
  documents,
  onAdd,
}: {
  documents: NestCourierDocument[];
  onAdd: () => void;
}) {
  const byType = new Map(documents.map((doc) => [doc.type, doc]));
  const visibleTypes = new Set<string>(COURIER_DOCUMENT_TYPES.map((meta) => meta.type));
  const hasAny = documents.some((doc) => visibleTypes.has(doc.type) && (doc.file_url || doc.expires_at));
  if (!hasAny) {
    return <EmptyHint action="העלאת מסמכים" onAction={onAdd} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {COURIER_DOCUMENT_TYPES.map((meta) => {
        const row = byType.get(meta.type);
        const expiry = formatDocExpiry(row?.expires_at ?? null);
        return (
          <div
            key={meta.type}
            className="rounded-xl border border-slate-100 p-3 text-end space-y-1"
          >
            <div className="text-sm font-bold text-slate-900">{meta.label}</div>
            {row?.file_url ? (
              <DocumentFileLink path={row.file_url} />
            ) : (
              <div className="text-xs text-slate-500">טרם הועלה</div>
            )}
            {expiry ? (
              <div className="text-xs text-slate-500">בתוקף עד {expiry}</div>
            ) : null}
            {row?.verified ? (
              <div className="text-xs font-semibold text-green-700">מאומת</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DocumentFileLink({ path }: { path: string }) {
  const { data: url, isPending } = useQuery({
    queryKey: ["courier-document-signed", path],
    queryFn: () => nestSignedFileUrlResolved("courier-documents", path, 60 * 60),
    staleTime: 1000 * 60 * 20,
  });
  if (isPending) return <div className="text-xs text-slate-500">הועלה</div>;
  if (!url) return <div className="text-xs text-slate-500">הועלה</div>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-green-600 text-xs font-semibold"
    >
      צפייה במסמך
    </a>
  );
}

function OsekBlock({
  me,
  onAdd,
}: {
  me: CourierSelfRow;
  onAdd: () => void;
}) {
  const rows = [
    { label: "סוג עוסק", value: me.business_type },
    { label: "מספר עוסק / ח.פ.", value: me.tax_id },
    { label: "שם לחשבונית", value: me.invoice_name },
  ].filter((row) => row.value?.trim());

  if (rows.length === 0) {
    return <EmptyHint action="הוספת פרטי עוסק" onAction={onAdd} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="text-end">
          <div className="text-xs text-slate-500 mb-0.5">{row.label}</div>
          <div className="text-sm font-semibold text-slate-900">{row.value}</div>
        </div>
      ))}
    </div>
  );
}
