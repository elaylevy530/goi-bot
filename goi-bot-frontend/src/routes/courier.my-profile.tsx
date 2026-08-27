import { createFileRoute, Link } from "@tanstack/react-router";
import { CourierShell } from "@/components/CourierShell";
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
  CreditCard,
  Umbrella,
  FileText,
  Headphones,
  ChevronLeft,
  Pen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courier/my-profile")({
  head: () => ({ meta: [{ title: "הפרופיל שלי — Goi" }] }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const courier = {
    name: "עומר כהן",
    verified: true,
    status: "שליח פעיל",
    courierNumber: "45821",
    rating: 4.9,
    totalRatings: 325,
    deliveries: 2026,
    deliveryMonth: "ינואר",
    workAreas: "מרכז ושרון",
    phone: "054-1234567",
    email: "omer.cohen@gmail.com",
    avatar: null,
    vehicle: {
      model: "SYM JoyRide 125",
      licensePlate: "12-345-67",
      year: 2021,
      type: "קטנוע",
    },
    documents: {
      driverLicense: { valid: true, expires: "20/07/2027" },
      vehicleLicense: { valid: true, expires: "15/03/2026" },
      insurance: { valid: true, expires: "01/04/2026" },
      comprehensiveInsurance: { valid: true, expires: "01/04/2026" },
    },
    business: {
      type: "עוסק פטור",
      number: "123456789",
      name: "עומר שליחויות",
    },
  };

  return (
    <CourierShell title="הפרופיל שלי" subtitle="" hideBackButton={false}>
      <div className="pb-6 space-y-4">
        {/* Profile Card */}
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-6 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute right-0 top-0 w-64 h-64 bg-green-500 rounded-full blur-3xl" />
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            {/* Top Section */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="size-24 rounded-full bg-slate-700 border-4 border-slate-600 overflow-hidden">
                    {courier.avatar ? (
                      <img
                        src={courier.avatar}
                        alt={courier.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                        <User className="size-12 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 size-8 bg-white rounded-full flex items-center justify-center border-2 border-slate-800">
                    <Camera className="size-4 text-slate-700" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    GO!
                  </div>
                </div>

                {/* Name & Status */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">
                      {courier.name}
                    </h2>
                    {courier.verified && (
                      <CheckCircle2 className="size-5 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1">
                    • {courier.status}
                  </Badge>
                  <div className="text-slate-400 text-sm mt-2">
                    מספר שליח: {courier.courierNumber}
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="flex flex-col items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-3">
                <Shield className="size-8 text-green-500" />
                <div className="text-center">
                  <div className="text-white text-xs font-semibold">
                    החשבון מאומת
                  </div>
                  <div className="text-slate-400 text-[10px]">במלואו</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {/* Deliveries */}
              <div className="flex flex-col items-center text-center">
                <Calendar className="size-5 text-green-500 mb-2" />
                <div className="text-slate-400 text-xs mb-1">
                  שליחויות היום-חודש
                </div>
                <div className="text-white font-bold">
                  {courier.deliveries} {courier.deliveryMonth}
                </div>
              </div>

              {/* Rating */}
              <div className="flex flex-col items-center text-center border-x border-slate-700/50">
                <Star className="size-5 text-yellow-500 fill-yellow-500 mb-2" />
                <div className="text-3xl font-bold text-white mb-1">
                  {courier.rating}
                </div>
                <div className="text-slate-400 text-xs">
                  ({courier.totalRatings} דירוגים)
                </div>
                <button className="text-green-500 text-xs mt-1 flex items-center gap-1">
                  לכל הדירוגים
                  <ChevronLeft className="size-3" />
                </button>
              </div>

              {/* Work Areas */}
              <div className="flex flex-col items-center text-center">
                <MapPin className="size-5 text-green-500 mb-2" />
                <div className="text-slate-400 text-xs mb-1">אזורי עבודה</div>
                <div className="text-white font-bold">{courier.workAreas}</div>
                <button className="text-green-500 text-xs mt-1 flex items-center gap-1">
                  לניהול אזורים
                  <ChevronLeft className="size-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-4">
            <User className="size-5 text-green-600" />
            <h3 className="text-base font-bold text-slate-900">פרטים אישיים</h3>
          </div>
          <Card className="p-0 overflow-hidden divide-y divide-slate-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Phone className="size-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">טלפון</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {courier.phone}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Mail className="size-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">אימייל</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {courier.email}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                  <User className="size-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">שם מלא</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {courier.name}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Vehicle Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי רכב</h3>
            </div>
            <button className="text-green-600 text-sm font-semibold flex items-center gap-1">
              <Pen className="size-4" />
              עריכת פרטי הרכב
            </button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">דגם</div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.vehicle.model}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">מספר רישוי</div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold text-slate-900 bg-yellow-100 px-2 py-1 rounded border border-yellow-400">
                    {courier.vehicle.licensePlate}
                  </span>
                  <Car className="size-4 text-blue-600" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">שנת ייצור</div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.vehicle.year}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">סוג רכב</div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.vehicle.type}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Documents & Approvals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">
                מסמכים ואישורים
              </h3>
            </div>
            <button className="text-green-600 text-sm font-semibold flex items-center gap-1">
              <ChevronLeft className="size-4" />
              עיצייניים בכל המסמכים
            </button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <DocumentCard
                icon={CreditCard}
                title="רישיון נהיגה"
                valid={courier.documents.driverLicense.valid}
                expires={courier.documents.driverLicense.expires}
              />
              <DocumentCard
                icon={Car}
                title="רישיון רכב"
                valid={courier.documents.vehicleLicense.valid}
                expires={courier.documents.vehicleLicense.expires}
              />
              <DocumentCard
                icon={Shield}
                title="ביטוח חובה"
                valid={courier.documents.insurance.valid}
                expires={courier.documents.insurance.expires}
              />
              <DocumentCard
                icon={Umbrella}
                title="ביטוח מקיף"
                valid={courier.documents.comprehensiveInsurance.valid}
                expires={courier.documents.comprehensiveInsurance.expires}
              />
            </div>
          </Card>
        </div>

        {/* Business Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-green-600" />
              <h3 className="text-base font-bold text-slate-900">פרטי עוסק</h3>
            </div>
            <button className="text-green-600 text-sm font-semibold flex items-center gap-1">
              <Pen className="size-4" />
              עריכת פרטי עוסק
            </button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">סוג עוסק</div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.business.type}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">מספר עוסק</div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.business.number}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">
                  שם העסק לחשבונית
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {courier.business.name}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Support Section */}
        <div className="bg-slate-50 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChevronLeft className="size-6 text-slate-400" />
              <div className="size-14 bg-green-100 rounded-full flex items-center justify-center">
                <Headphones className="size-7 text-green-600" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 mb-1">
                  זקוק לעזרה?
                </div>
                <div className="text-sm text-slate-600">
                  צוות ההתמכה שלנו כאן במיוחד
                </div>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-6 text-base rounded-xl">
              איש עם התמיכה
            </Button>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}

function DocumentCard({
  icon: Icon,
  title,
  valid,
  expires,
}: {
  icon: typeof Shield;
  title: string;
  valid: boolean;
  expires: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="size-12 bg-green-50 rounded-lg flex items-center justify-center mb-2">
        <Icon className="size-6 text-green-600" />
      </div>
      <div className="text-xs font-semibold text-slate-900 mb-1 text-center">
        {title}
      </div>
      {valid && (
        <>
          <div className="flex items-center gap-1 text-green-600 mb-1">
            <CheckCircle2 className="size-3 fill-green-600" />
            <span className="text-xs font-semibold">בתוקף</span>
          </div>
          <div className="text-[10px] text-slate-500">עד {expires}</div>
        </>
      )}
    </div>
  );
}
