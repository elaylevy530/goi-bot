import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { registerCourier } from "@/lib/courier-intake.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, Loader2, User, Phone, MapPin, Bike,
  Car, Zap, MoreHorizontal, Package, Clock, Route as RouteIcon, Plus,
  UtensilsCrossed, Boxes, Check, ClipboardList, MessageCircle, Lock,
  Briefcase, Award, Ruler, Bell, ThumbsUp, Sparkles, Send,
  Camera, Upload, X, KeyRound,
} from "lucide-react";
import { BackNav } from "@/components/BackNav";
import { toast } from "sonner";
import { cacheCourierKind } from "@/lib/courier-kind";
// ---------- Option lists ----------
const CITY_OPTIONS = [
  "כל הארץ","תל אביב","רמת גן","גבעתיים","פתח תקווה","בני ברק",
  "ראשון לציון","חולון","בת ים","הרצליה","רעננה","כפר סבא",
  "נתניה","רחובות","נס ציונה","ירושלים","חיפה","קריות",
  "אשדוד","אשקלון","באר שבע","אחר",
];

type CourierKind = "courier" | "mover";

const VEHICLES_BY_KIND: Record<CourierKind, { value: string; icon: typeof Bike }[]> = {
  courier: [
    { value: "קטנוע", icon: Bike },
    { value: "אופניים חשמליים", icon: Zap },
    { value: "רכב", icon: Car },
    { value: "קורקינט חשמלי", icon: Zap },
    { value: "אופניים רגילים", icon: Bike },
    { value: "אחר", icon: MoreHorizontal },
  ],
  mover: [
    { value: "טנדר", icon: Car },
    { value: "משאית קטנה", icon: Package },
    { value: "משאית 12 טון", icon: Package },
    { value: "משאית 15 טון+", icon: Package },
    { value: "צוות מובילים", icon: Boxes },
    { value: "אחר", icon: MoreHorizontal },
  ],
};

const JOB_OPTIONS_BY_KIND: Record<
  CourierKind,
  { value: string; icon: typeof Package; db: string }[]
> = {
  courier: [
    { value: "משלוחים בודדים", icon: Package, db: "משלוח בודד" },
    { value: "משמרות לפי שעה", icon: Clock, db: "משמרת לפי שעה" },
    { value: "קווים קבועים / חלוקה", icon: RouteIcon, db: "קו חלוקה" },
    { value: "משלוחי אוכל", icon: Package, db: "משלוחי אוכל" },
    { value: "חבילות / מסמכים", icon: Boxes, db: "חבילות / מסמכים" },
    { value: "הכול מתאים לי", icon: Check, db: "*" },
  ],
  mover: [
    { value: "הובלות קטנות / פריט בודד", icon: Package, db: "הובלה קטנה" },
    { value: "הובלת דירה שלמה", icon: Boxes, db: "הובלת דירה" },
    { value: "הובלת משרד", icon: Briefcase, db: "הובלת משרד" },
    { value: "פינויי דירה", icon: Package, db: "פינוי דירה" },
    { value: "הובלות בין עירוניות", icon: RouteIcon, db: "הובלה בין עירונית" },
    { value: "פירוק והרכבה", icon: Boxes, db: "פירוק והרכבה" },
    { value: "אריזה", icon: Package, db: "אריזה" },
    { value: "אחסנה", icon: Boxes, db: "אחסנה" },
    { value: "הכול מתאים לי", icon: Check, db: "*" },
  ],
};

const CREW_OPTIONS = [
  "לבד",
  "עם עוזר אחד (2 אנשים)",
  "צוות של 3",
  "צוות של 4+",
  "משתנה לפי עבודה",
];

const MOVER_EQUIPMENT = [
  "מנוף / ליפט",
  "שמיכות / ריפוד",
  "רצועות / חגורות",
  "עגלות משא",
  "כלי פירוק והרכבה",
  "חומרי אריזה",
];

const FLOOR_OPTIONS = [
  "רק עם מעלית",
  "עד קומה 2 בלי מעלית",
  "עד קומה 4 בלי מעלית",
  "כל קומה — אין בעיה",
];




const DISTANCE_OPTIONS = [
  "רק בתוך העיר שלי",
  "עד 5 ק״מ מחוץ לעיר",
  "עד 10 ק״מ מחוץ לעיר",
  "עד 20 ק״מ מחוץ לעיר",
  "עד 30 ק״מ מחוץ לעיר",
  "כל אזור המרכז",
  "כל הארץ",
];

const EXPERIENCE_STATUS = [
  "כן, עובד בזה היום",
  "כן, עבדתי בעבר",
  "אין ניסיון אבל רוצה להתחיל",
];

const EXPERIENCE_DURATION = [
  "פחות מחודש",
  "1-3 חודשים",
  "3-6 חודשים",
  "חצי שנה עד שנה",
  "שנה ומעלה",
  "מעל 3 שנים",
];

const INVOICE_OPTIONS = [
  { value: "כן", db: "כן" as const },
  { value: "לא", db: "לא" as const },
  { value: "תסדרו אותי", db: "תסדרו אותי" as const, sub: "אפשר לעבוד בלי — נטפל בקיזוז" },
];

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Section({ n, title, icon: Icon, children, sub }: {
  n: number | string; title: string; icon: typeof User; sub?: string; children: React.ReactNode;
}) {

  return (
    <section className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        <span className="size-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
          {n}
        </span>
      </div>
      {sub && <p className="text-xs text-muted-foreground text-right mb-3">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChoiceCard({ active, onClick, children, className = "" }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-right rounded-xl border-2 px-3 py-3 transition-all flex items-center gap-2 ${
        active
          ? "border-primary bg-primary/5 text-foreground shadow-sm"
          : "border-border bg-white text-foreground hover:border-primary/50"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function CitiesGrid({
  value, onChange, addLabel = "אזור / עיר נוספת", addPlaceholder = "כתוב עיר או אזור נוסף",
}: {
  value: string[]; onChange: (v: string[]) => void;
  addLabel?: string; addPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const allKnown = new Set(CITY_OPTIONS.map((c) => c.toLowerCase()));
  // Custom (user-added) cities = anything in value that isn't in CITY_OPTIONS
  const customCities = value.filter((v) => !allKnown.has(v.toLowerCase()));
  // Show all default options + any custom cities the user already added
  const allOptions = [...CITY_OPTIONS.filter((c) => c !== "אחר"), ...customCities, "אחר"];

  const exists = trimmed.length > 0 && allOptions.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  const canAdd = trimmed.length >= 2 && !exists;

  const handleAdd = () => {
    if (!canAdd) return;
    const next = [...value.filter((x) => x !== "כל הארץ"), trimmed];
    onChange(next);
    setQuery("");
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {allOptions.map((a) => {
          const on = value.includes(a);
          const isAll = a === "כל הארץ";
          return (
            <ChoiceCard
              key={a}
              active={on}
              onClick={() => {
                if (isAll) {
                  onChange(on ? [] : ["כל הארץ"]);
                } else {
                  const next = toggle(value.filter((x) => x !== "כל הארץ"), a);
                  onChange(next);
                }
              }}
              className={isAll ? "border-primary/40 bg-primary/5 font-semibold" : ""}
            >
              <Checkbox checked={on} className="pointer-events-none" />
              <span className="flex-1 text-sm font-medium">{a}</span>
            </ChoiceCard>
          );
        })}
      </div>

      <div className="mt-3">
        <label className="text-sm font-medium block mb-1.5">{addLabel}</label>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={addPlaceholder}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="size-4" /> הוסף וסמן
          </Button>
        </div>
        {trimmed.length > 0 && exists && (
          <p className="text-xs text-muted-foreground mt-1">העיר כבר ברשימה — סמן אותה למעלה</p>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ b64: String(r.result), mime: file.type });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function IdPhotoPicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const cameraId = `cam-${label}`;
  const uploadId = `up-${label}`;
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {preview ? (
        <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden">
          <img src={preview} alt={label} className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 left-1.5 bg-background/90 hover:bg-background border border-border rounded-full p-1 shadow"
            aria-label="הסר"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label
            htmlFor={cameraId}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer py-4 text-xs text-muted-foreground transition-colors"
          >
            <Camera className="size-5 text-primary" />
            <span>צלם</span>
            <input
              id={cameraId}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <label
            htmlFor={uploadId}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer py-4 text-xs text-muted-foreground transition-colors"
          >
            <Upload className="size-5 text-primary" />
            <span>העלה</span>
            <input
              id={uploadId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function JoinPage() {
  const register = useServerFn(registerCourier);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idPhotoFront, setIdPhotoFront] = useState<File | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<File | null>(null);
  const [gender, setGender] = useState<string>("");

  const [baseCity, setBaseCity] = useState("");
  const [wantedAreas, setWantedAreas] = useState<string[]>([]);

  const [distance, setDistance] = useState<string>("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [invoice, setInvoice] = useState<string>("");
  const [expStatus, setExpStatus] = useState<string>("");
  const [expDuration, setExpDuration] = useState<string>("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(true);
  const [done, setDone] = useState(false);
  const [kind, setKind] = useState<CourierKind | null>(null);

  // Mover-specific
  const [crewSize, setCrewSize] = useState<string>("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [floors, setFloors] = useState<string>("");
  const [minJobPrice, setMinJobPrice] = useState<string>("");


  const VEHICLES = kind ? VEHICLES_BY_KIND[kind] : VEHICLES_BY_KIND.courier;
  const JOB_OPTIONS = kind ? JOB_OPTIONS_BY_KIND[kind] : JOB_OPTIONS_BY_KIND.courier;


  const showDuration = expStatus === "כן, עובד בזה היום" || expStatus === "כן, עבדתי בעבר";

  const mut = useMutation({
    mutationFn: async () => {
      const dbJobs = jobs.includes("הכול מתאים לי")
        ? JOB_OPTIONS.filter((j) => j.db !== "*").map((j) => j.db)
        : (jobs.map((j) => JOB_OPTIONS.find((x) => x.value === j)?.db).filter(Boolean) as string[]);

      const invoiceDb = INVOICE_OPTIONS.find((i) => i.value === invoice)?.db ?? "לא";

      let id_photo_base64: string | null = null;
      let id_photo_mime: string | null = null;
      if (idPhotoFront) {
        const { b64, mime } = await fileToBase64(idPhotoFront);
        id_photo_base64 = b64;
        id_photo_mime = mime;
      }
      let id_photo_back_base64: string | null = null;
      let id_photo_back_mime: string | null = null;
      if (idPhotoBack) {
        const { b64, mime } = await fileToBase64(idPhotoBack);
        id_photo_back_base64 = b64;
        id_photo_back_mime = mime;
      }

      return register({
        data: {
          full_name: fullName,
          whatsapp_phone: phone,
          id_number: idNumber || null,
          id_photo_base64,
          id_photo_mime,
          id_photo_back_base64,
          id_photo_back_mime,
          gender: gender || null,
          base_city: baseCity,
          wanted_work_areas: wantedAreas,
          custom_work_area: null,
          pickup_areas: [],
          custom_pickup_area: null,
          dropoff_areas: [],
          custom_dropoff_area: null,
          work_distance_from_base: distance || null,
          vehicle_types: kind === "mover"
            ? [...vehicleTypes, ...equipment.map((e) => `ציוד: ${e}`)]
            : vehicleTypes,
          job_types: kind === "mover"
            ? [
                ...dbJobs,
                ...(crewSize ? [`צוות: ${crewSize}`] : []),
                ...(floors ? [`קומות: ${floors}`] : []),
                ...(minJobPrice ? [`מינימום עבודה: ${minJobPrice} ₪`] : []),
              ]
            : dbJobs,

          invoice_status: invoiceDb,
          courier_experience_status: expStatus || null,
          courier_experience_duration: showDuration ? (expDuration || null) : null,
          consent_whatsapp: consent,
          password: password || null,
          courier_kind: kind ?? "courier",
        },
      });
    },
    onSuccess: async (res) => {
      if (res?.accountCreated && password) {
        const raw = phone.replace(/\D/g, "");
        const digits = raw.startsWith("972") ? raw : raw.startsWith("0") ? "972" + raw.slice(1) : raw;
        const email = `${digits}@couriers.goi.local`;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          cacheCourierKind(kind ?? "courier");
          await qc.invalidateQueries();
          qc.setQueryData(["my-courier-kind"], kind ?? "courier");
          toast.success(
            kind === "mover"
              ? "נרשמת בהצלחה! מעבר לפאנל המובילים..."
              : "נרשמת בהצלחה! מעבר לאזור האישי...",
          );
          setTimeout(() => navigate({ to: "/courier" }), 600);
          return;
        }
        toast.success("נרשמת בהצלחה! התחבר עם הטלפון והסיסמה שלך");
        setTimeout(() => navigate({ to: "/courier-login" }), 600);
        return;
      }
      setDone(true);
      toast.success("נרשמת בהצלחה! בקשתך נשלחה לאישור");
    },
    onError: (e: Error) => toast.error(e.message || "שגיאה בשליחה"),
  });

  const canSubmit =
    fullName.trim().length >= 2 &&
    phone.trim().length >= 7 &&
    idNumber.trim().length >= 9 &&
    gender &&
    baseCity.trim().length >= 2 &&
    expStatus &&
    vehicleTypes.length > 0 &&
    password.length >= 6 &&
    consent;

  if (done) {
    return (
      <div className="min-h-screen bg-[#f6f8f7] py-8 px-4" dir="rtl">
        <div className="max-w-xl mx-auto space-y-5">
          <BackNav />
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#2a8a20] text-primary-foreground p-7 sm:p-9 shadow-xl">
            <div className="absolute -top-10 -left-10 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-12 -right-8 size-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative">
              <div className="size-16 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mb-4">
                <CheckCircle2 className="size-9" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                ברוך הבא ל-Goi! 🎉
              </h1>
              <p className="mt-2 text-base opacity-95">
                ההרשמה התקבלה. אנחנו מסננים את הפרטים שלך ומכינים את הבוט לשלוח לך עבודות מתאימות.
              </p>
            </div>
          </div>

          {/* What is Goi */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <Sparkles className="size-5 text-primary" />
              מה זה Goi?
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Goi מחברת בין עסקים שצריכים משלוח לבין שליחים זמינים באזור — בלי אפליקציות מסורבלות,
              בלי משמרות מחייבות. הכל קורה בוואטסאפ, מהטלפון שכבר יש לך ביד.
            </p>
          </section>

          {/* How the bot works */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <MessageCircle className="size-5 text-primary" />
              איך הבוט עובד?
            </h2>
            <ol className="space-y-4">
              {[
                { icon: Bell, title: "מגיעה עבודה — מקבל הודעה בוואטסאפ",
                  text: "כשיש משלוח שמתאים לאזור, לרכב ולסוג העבודה שלך — הבוט שולח לך הודעה עם כל הפרטים: איסוף, מסירה, מחיר וזמן." },
                { icon: ThumbsUp, title: "אתה מחליט — מאשר או דוחה",
                  text: "מתאים לך? לוחץ אישור. לא מתאים? פשוט דוחה — בלי שאלות. העבודה תוצע לשליח הבא." },
                { icon: Send, title: "מבצע את המשלוח ומקבל תשלום",
                  text: "מתאם עם הלקוח דרך הבוט, מבצע איסוף ומסירה, מסמן ׳הושלם׳ — והתשלום נרשם." },
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <div className="shrink-0 size-10 rounded-xl bg-primary/10 grid place-items-center">
                    <s.icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">
                      <span className="text-primary font-bold">{i + 1}.</span> {s.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Next step */}
          <section className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="shrink-0 size-10 rounded-xl bg-primary/10 grid place-items-center">
                <Phone className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">מה קורה עכשיו?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  שמור את המספר של Goi באנשי הקשר שלך כדי שההודעות יגיעו מסומנות.
                  ההצעה הראשונה תגיע ברגע שתהיה עבודה שמתאימה לך.
                </p>
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
            <Lock className="size-3.5" />
            הפרטים שלך מאובטחים ולא יועברו לגורם חיצוני
          </p>
        </div>
      </div>
    );
  }

  // Role picker: shown first, before the full form
  if (!kind) {
    return (
      <div className="min-h-screen bg-[#f6f8f7] py-8 md:py-14 px-4" dir="rtl">
        <div className="max-w-3xl mx-auto">
          <BackNav />
          <header className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-1 mb-3">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-primary">G</span>
                <span className="text-foreground">oi</span>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
              מה מתאר אותך הכי טוב?
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              בחר את סוג העבודה שאתה מבצע — נתאים לך טופס והצעות עבודה מדויקות
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setKind("courier")}
              className="group text-right bg-white rounded-3xl border-2 border-border hover:border-primary hover:shadow-xl transition-all p-6 md:p-8"
            >
              <div className="size-14 rounded-2xl bg-primary/10 grid place-items-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Bike className="size-8 text-primary" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-1.5">שליח</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                אופנוע, קטנוע, אופניים חשמליים או רכב פרטי. משלוחי חבילות, מסמכים וקווי חלוקה לפרטיים ולעסקים.
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> משלוחים מהירים בעיר</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> חבילות עד ~30 ק״ג</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> משמרות וקווים קבועים</li>
              </ul>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                אני שליח <Send className="size-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKind("mover")}
              className="group text-right bg-white rounded-3xl border-2 border-border hover:border-primary hover:shadow-xl transition-all p-6 md:p-8"
            >
              <div className="size-14 rounded-2xl bg-primary/10 grid place-items-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Boxes className="size-8 text-primary" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-1.5">מוביל</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                טנדר, משאית או צוות מובילים. גם הובלות קטנות של פריט בודד וגם הובלות דירה, משרד ופינויים.
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> הובלות קטנות ופריטים בודדים</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> הובלת דירה, משרד ופינויים</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> לבד או עם צוות — אתה בוחר</li>
              </ul>

              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                אני מוביל <Send className="size-4" />
              </div>
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            עובד בשניהם? אפשר לבחור עכשיו את סוג העבודה העיקרי — נוכל להוסיף כלי רכב נוספים אחר כך מהאזור האישי.
          </p>
        </div>
      </div>
    );
  }

  const kindLabel = kind === "mover" ? "מובילים" : "שליחים";
  const kindLabelSingular = kind === "mover" ? "מוביל" : "שליח";

  return (
    <div className="min-h-screen bg-[#f6f8f7] py-6 md:py-10 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <BackNav />
        <header className="relative text-center mb-6 md:mb-8">
          <div className="absolute left-0 top-0 hidden sm:block">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center">
              <MessageCircle className="size-8 text-primary" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1 mb-2">
            <span className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="text-primary">G</span>
              <span className="text-foreground">oi</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            הרשמה ל{kindLabel} של Goi
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            קבל הצעות עבודה ישירות בוואטסאפ — בלי אפליקציות, בלי התחייבות
          </p>
          <button
            type="button"
            onClick={() => { setKind(null); setVehicleTypes([]); setJobs([]); setCrewSize(""); setEquipment([]); setFloors(""); setMinJobPrice(""); }}
            className="mt-3 text-xs text-primary hover:underline font-semibold"
          >
            נרשמת בטעות כ{kindLabelSingular}? החלף סוג
          </button>
        </header>


        <div className="space-y-4 md:space-y-5">
          {/* 1. Personal */}
          <Section n={1} title="פרטים אישיים" icon={User}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">שם מלא <span className="text-destructive">*</span></label>
                <div className="relative">
                  <User className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="הזן את שמך המלא" className="pr-9" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">מספר טלפון (וואטסאפ) <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Phone className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05X-XXX-XXXX" inputMode="tel" className="pr-9" />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium block mb-1.5">
                תעודת זהות <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <ClipboardList className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="9 ספרות"
                  inputMode="numeric"
                  maxLength={12}
                  className="pr-9"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium block mb-1.5">
                צילום ת״ז <span className="text-xs text-muted-foreground font-normal">(לא חובה — אפשר לצלם ישר מהטלפון)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <IdPhotoPicker label="צד קדמי" file={idPhotoFront} onChange={setIdPhotoFront} />
                <IdPhotoPicker label="צד אחורי" file={idPhotoBack} onChange={setIdPhotoBack} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium block mb-1.5">מין <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {["זכר", "נקבה"].map((g) => (
                  <ChoiceCard key={g} active={gender === g} onClick={() => setGender(g)} className="justify-center">
                    <span className="text-sm font-medium">{g}</span>
                  </ChoiceCard>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 ניתן להעלות צילום תעודת זהות גם מתוך המערכת אחרי ההרשמה.
            </p>
          </Section>

          {/* 2. Base city */}
          <Section
            n={2}
            title="איפה אתה גר או בסיס יציאה לעבודה שלך בדרך כלל?"
            icon={MapPin}
            sub="זה עוזר לנו לשלוח לך עבודות שמתאימות למיקום שלך"
          >
            <Input
              value={baseCity}
              onChange={(e) => setBaseCity(e.target.value)}
              placeholder="לדוגמה: תל אביב"
            />
          </Section>

          {/* 3. Wanted work areas */}
          <Section
            n={3}
            title="באילו ערים / אזורים אתה רוצה לקבל עבודות?"
            icon={MapPin}
            sub="אפשר לבחור כמה אזורים או לבחור כל הארץ"
          >
            <CitiesGrid value={wantedAreas} onChange={setWantedAreas} />
          </Section>

          {/* 4. Distance — couriers only */}
          {kind !== "mover" && (
            <Section
              n={4}
              title="באיזה מרחק מאזור הבסיס שלך אתה רוצה לקבל עבודות?"
              icon={Ruler}
              sub="המרחק מחושב לפי עיר הבסיס שבחרת. את ההתאמה הסופית (איסוף/מסירה) תאשר בבוט לכל עבודה"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DISTANCE_OPTIONS.map((d) => (
                  <ChoiceCard key={d} active={distance === d} onClick={() => setDistance(d)}>
                    <div className={`size-4 rounded-full border-2 ${distance === d ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                      {distance === d && <div className="size-full rounded-full bg-primary-foreground scale-[0.4]" />}
                    </div>
                    <span className="text-sm font-medium">{d}</span>
                  </ChoiceCard>
                ))}
              </div>
            </Section>
          )}


          {/* 5. Vehicle */}
          <Section n={5} title="עם מה אתה עובד?" icon={Bike} sub="אפשר לבחור יותר מכלי אחד">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {VEHICLES.map((v) => {
                const on = vehicleTypes.includes(v.value);
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVehicleTypes(toggle(vehicleTypes, v.value))}
                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                      on ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
                    }`}
                  >
                    <Checkbox checked={on} className="pointer-events-none self-start" />
                    <v.icon className={`size-7 ${on ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-center">{v.value}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 6. Job types */}
          <Section n={6} title="איזה עבודות מעניינות אותך?" icon={Package} sub="אפשר לבחור יותר מאחד">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {JOB_OPTIONS.map((j) => {
                const on = jobs.includes(j.value);
                return (
                  <button
                    key={j.value}
                    type="button"
                    onClick={() => setJobs(toggle(jobs, j.value))}
                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                      on ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/50"
                    }`}
                  >
                    <Checkbox checked={on} className="pointer-events-none self-start" />
                    <j.icon className={`size-6 ${on ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-center">{j.value}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Mover-only extras */}
          {kind === "mover" && (
            <>
              <Section n={"6א"} title="עובד לבד או עם צוות?" icon={Boxes} sub="חשוב לנו כדי להתאים לך עבודות בגודל הנכון">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CREW_OPTIONS.map((c) => (
                    <ChoiceCard key={c} active={crewSize === c} onClick={() => setCrewSize(c)}>
                      <div className={`size-4 rounded-full border-2 shrink-0 ${crewSize === c ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                        {crewSize === c && <div className="size-full rounded-full bg-primary-foreground scale-[0.4]" />}
                      </div>
                      <span className="text-sm font-medium">{c}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </Section>



            </>
          )}



          {/* 7. Experience */}
          <Section n={7} title={`יש לך ניסיון כ${kindLabelSingular}?`} icon={Award}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {EXPERIENCE_STATUS.map((e) => (
                <ChoiceCard key={e} active={expStatus === e} onClick={() => setExpStatus(e)}>
                  <div className={`size-4 rounded-full border-2 shrink-0 ${expStatus === e ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                    {expStatus === e && <div className="size-full rounded-full bg-primary-foreground scale-[0.4]" />}
                  </div>
                  <span className="text-sm font-medium">{e}</span>
                </ChoiceCard>
              ))}
            </div>
            {showDuration && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">כמה זמן ניסיון יש לך {kind === "mover" ? "בהובלות" : "בשליחויות"}?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {EXPERIENCE_DURATION.map((d) => (
                    <ChoiceCard key={d} active={expDuration === d} onClick={() => setExpDuration(d)} className="justify-center">
                      <span className="text-sm font-medium">{d}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 8. Invoice */}
          <Section n={8} title="יש לך חשבונית / קבלה?" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {INVOICE_OPTIONS.filter((i) => (kind === "mover" ? i.value !== "לא" : true)).map((i) => (
                <ChoiceCard key={i.value} active={invoice === i.value} onClick={() => setInvoice(i.value)} className={`justify-center flex-col ${i.sub ? "py-3" : ""}`}>
                  <span className="text-sm font-medium">{i.value}</span>
                  {i.sub && <span className="text-[11px] text-muted-foreground text-center leading-tight">{i.sub}</span>}
                </ChoiceCard>
              ))}
            </div>
          </Section>


          {/* 8b. Password — for personal area */}
          <Section n={9} title="בחר סיסמה לאזור האישי שלך" icon={KeyRound} sub="עם המספר שלך + הסיסמה תוכל להיכנס לאזור האישי שלך באתר">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground mt-2">
              כבר רשום? <Link to="/courier-login" className="underline">היכנס כאן</Link>
            </p>
          </Section>

          {/* 10. Consent */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <MessageCircle className="size-5 text-primary" />
              אישור קבלת הצעות
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} className="mt-0.5" />
              <span className="text-sm text-foreground">
                אני מאשר/ת לקבל הצעות עבודה ועדכונים מ-<b>Goi</b> בוואטסאפ
              </span>
            </label>
          </section>

          <Button
            size="lg"
            disabled={!canSubmit || mut.isPending}
            onClick={() => mut.mutate()}
            className="w-full h-14 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2"
          >
            {mut.isPending ? <Loader2 className="size-5 animate-spin" /> : <MessageCircle className="size-5" />}
            הצטרף לבוט העבודות
          </Button>

          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
            <Lock className="size-3.5" />
            הפרטים שלך נשמרים בצורה מאובטחת ולא יעברו לגורם אחר
          </p>
        </div>
      </div>
    </div>
  );
}
