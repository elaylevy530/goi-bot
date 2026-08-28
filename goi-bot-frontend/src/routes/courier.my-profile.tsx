import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  User,
  Star,
  MapPin,
  Calendar,
  CheckCircle2,
  Shield,
  Camera,
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

export const Route = createFileRoute("/courier/my-profile")({
  head: () => ({ meta: [{ title: "הפרופיל שלי — Goi" }] }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const terms = useCourierTerms();
  const { data: meRaw, isPending } = useMyCourier();
  const me = meRaw as CourierSelfRow | null | undefined;
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
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute right-0 top-0 w-64 h-64 bg-green-500 rounded-full blur-3xl" />
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="size-24 rounded-full bg-slate-700 border-4 border-slate-600 overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 text-white text-2xl font-extrabold">
                        {courierInitials(me.full_name)}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/courier/my-profile/edit"
                    className="absolute bottom-0 right-0 size-8 bg-white rounded-full flex items-center justify-center border-2 border-slate-800"
                    aria-label="עריכת תמונת פרופיל"
                  >
                    <Camera className="size-4 text-slate-700" />
                  </Link>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    GO!
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">{name}</h2>
                    {verified && (
                      <CheckCircle2 className="size-5 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <Badge
                    className={cn(
                      "text-white text-xs font-semibold px-3 py-1",
                      status.available
                        ? "bg-green-600 hover:bg-green-600"
                        : "bg-slate-500 hover:bg-slate-500",
                    )}
                  >
                    • {status.label}
                  </Badge>
                </div>
              </div>

              {verified && (
                <div className="flex flex-col items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-3">
                  <Shield className="size-8 text-green-500" />
                  <div className="text-center">
                    <div className="text-white text-xs font-semibold">החשבון מאומת</div>
                    <div className="text-slate-400 text-[10px]">פרטי בנק</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <Calendar className="size-5 text-green-500 mb-2" />
                <div className="text-slate-400 text-xs mb-1">שליחויות החודש</div>
                <div className="text-white font-bold">
                  {stats.isLoading ? "—" : stats.deliveriesThisMonth} {stats.monthLabel}
                </div>
              </div>

              <div className="flex flex-col items-center text-center border-x border-slate-700/50">
                <Star className="size-5 text-yellow-500 fill-yellow-500 mb-2" />
                <div className="text-3xl font-bold text-white mb-1">
                  {stats.isLoading
                    ? "—"
                    : stats.avgRating != null
                      ? stats.avgRating.toFixed(1)
                      : "—"}
                </div>
                <div className="text-slate-400 text-xs">
                  {stats.isLoading
                    ? ""
                    : stats.ratingCount > 0
                      ? `(${stats.ratingCount} דירוגים)`
                      : "(אין דירוגים עדיין)"}
                </div>
                <Link
                  to="/courier/ratings"
                  className="text-green-500 text-xs mt-1 flex items-center gap-1"
                >
                  לכל הדירוגים
                  <ChevronLeft className="size-3" />
                </Link>
              </div>

              <div className="flex flex-col items-center text-center">
                <MapPin className="size-5 text-green-500 mb-2" />
                <div className="text-slate-400 text-xs mb-1">אזורי עבודה</div>
                <div className="text-white font-bold">{workAreas ?? "טרם הוזן"}</div>
                <Link
                  to="/courier/availability"
                  className="text-green-500 text-xs mt-1 flex items-center gap-1"
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
            <Link
              to="/courier/my-profile/edit"
              className="text-green-600 text-sm font-semibold flex items-center gap-1"
            >
              <Pen className="size-4" />
              עריכה
            </Link>
          </div>
          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            <DetailRow icon={Phone} label="טלפון" value={displayOrDash(me.whatsapp_phone)} />
            <DetailRow icon={Mail} label="אימייל" value={displayOrDash(me.email)} />
            <DetailRow icon={User} label="שם מלא" value={displayOrDash(me.full_name)} />
            {me.courier_number?.trim() ? (
              <DetailRow icon={Hash} label="מספר שליח" value={me.courier_number.trim()} />
            ) : null}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי רכב</h3>
            </div>
            <Link
              to="/courier/my-profile/edit"
              className="text-green-600 text-sm font-semibold flex items-center gap-1"
            >
              <Pen className="size-4" />
              עריכת פרטי הרכב
            </Link>
          </div>
          <Card className="p-4">
            <VehicleGrid me={me} />
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">מסמכים ואישורים</h3>
            </div>
            <Link
              to="/courier/my-profile/edit"
              className="text-green-600 text-sm font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="size-4" />
              עדכון בפרופיל
            </Link>
          </div>
          <Card className="p-4">
            <DocumentsGrid documents={documents} />
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי עוסק</h3>
            </div>
            <Link
              to="/courier/my-profile/edit"
              className="text-green-600 text-sm font-semibold flex items-center gap-1"
            >
              <Pen className="size-4" />
              עריכת פרטים
            </Link>
          </div>
          <Card className="p-4">
            <OsekBlock me={me} />
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
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-6 text-base rounded-xl"
            >
              <Link to="/courier/messages">פנה לתמיכה</Link>
            </Button>
          </div>
        </div>
      </div>
    </CourierShell>
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
  to,
  action,
}: {
  to: "/courier/my-profile/edit";
  action: string;
}) {
  return (
    <div className="text-center space-y-2">
      <p className="text-sm text-slate-500">טרם הוזן</p>
      <Link
        to={to}
        className="text-green-600 text-sm font-semibold inline-flex items-center gap-1"
      >
        {action}
        <ChevronLeft className="size-4" />
      </Link>
    </div>
  );
}

function VehicleGrid({ me }: { me: CourierSelfRow }) {
  const cells = [
    { label: "סוג רכב", value: me.vehicle_type },
    { label: "רכב", value: me.vehicle_label },
    { label: "מספר רישוי", value: me.vehicle_plate },
    {
      label: "שנת ייצור",
      value: me.vehicle_year != null ? String(me.vehicle_year) : null,
    },
  ].filter((cell) => cell.value?.toString().trim());

  if (cells.length === 0) {
    return <EmptyHint to="/courier/my-profile/edit" action="הוספת פרטי רכב" />;
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

function DocumentsGrid({ documents }: { documents: NestCourierDocument[] }) {
  const byType = new Map(documents.map((doc) => [doc.type, doc]));
  const hasAny = documents.some((doc) => doc.file_url || doc.expires_at);
  if (!hasAny) {
    return <EmptyHint to="/courier/my-profile/edit" action="העלאת מסמכים בפרופיל" />;
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

function OsekBlock({ me }: { me: CourierSelfRow }) {
  const rows = [
    { label: "סוג עוסק", value: me.business_type },
    { label: "מספר עוסק / ח.פ.", value: me.tax_id },
    { label: "שם לחשבונית", value: me.invoice_name },
  ].filter((row) => row.value?.trim());

  if (rows.length === 0) {
    return <EmptyHint to="/courier/my-profile/edit" action="עריכת פרטים בפרופיל" />;
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
