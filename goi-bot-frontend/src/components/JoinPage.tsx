import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { nestRegisterCourier } from "@/lib/nest-auth";
import {
  CheckCircle2, Loader2, User, Phone, MapPin, Bike,
  Car, Zap, MoreHorizontal, Package,
  Boxes, ClipboardList, MessageCircle, Lock,
  Briefcase, Bell, ThumbsUp, Sparkles, Send,
  Camera, Upload, X, KeyRound,
} from "lucide-react";
import { BackNav } from "@/components/BackNav";
import { WorkAreaPicker } from "@/components/courier/WorkAreaPicker";
import { composeWorkingAreas, workAreaSelectionError } from "@/lib/regions";
import { toast } from "sonner";
import { cacheCourierKind } from "@/lib/courier-kind";

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

const CREW_OPTIONS = [
  "לבד",
  "עם עוזר אחד (2 אנשים)",
  "צוות של 3",
  "צוות של 4+",
  "משתנה לפי עבודה",
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

export function JoinPage({ referredBy }: { referredBy?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idPhotoFront, setIdPhotoFront] = useState<File | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<File | null>(null);
  const [gender, setGender] = useState<string>("");

  const [baseCity, setBaseCity] = useState("");
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [workCities, setWorkCities] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [invoice, setInvoice] = useState<string>("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(true);
  const [done, setDone] = useState(false);
  // Product scope: courier registration only (movers live elsewhere).
  const kind: CourierKind = "courier";

  // Mover-specific
  const [crewSize, setCrewSize] = useState<string>("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [floors, setFloors] = useState<string>("");
  const [minJobPrice, setMinJobPrice] = useState<string>("");

  const VEHICLES = kind ? VEHICLES_BY_KIND[kind] : VEHICLES_BY_KIND.courier;

  const mut = useMutation({
    mutationFn: async () => {
      const areasError = workAreaSelectionError(workAreas, workCities);
      if (areasError) throw new Error(areasError);
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

      return nestRegisterCourier({
        full_name: fullName,
        whatsapp_phone: phone,
        id_number: idNumber || null,
        id_photo_base64,
        id_photo_mime,
        id_photo_back_base64,
        id_photo_back_mime,
        gender: gender || null,
        base_city: baseCity,
        wanted_work_areas: composeWorkingAreas(workAreas, workCities),
        custom_work_area: null,
        pickup_areas: [],
        custom_pickup_area: null,
        dropoff_areas: [],
        custom_dropoff_area: null,
        work_distance_from_base: null,
        vehicle_types: kind === "mover"
          ? [...vehicleTypes, ...equipment.map((e) => `ציוד: ${e}`)]
          : vehicleTypes,
        job_types: kind === "mover"
          ? [
              ...(crewSize ? [`צוות: ${crewSize}`] : []),
              ...(floors ? [`קומות: ${floors}`] : []),
              ...(minJobPrice ? [`מינימום עבודה: ${minJobPrice} ₪`] : []),
            ]
          : [],
        invoice_status: invoiceDb,
        courier_experience_status: null,
        courier_experience_duration: null,
        consent_whatsapp: consent,
        password: password || null,
        courier_kind: kind ?? "courier",
        ...(referredBy
          ? { referred_by: referredBy, referral_code: referredBy }
          : {}),
      });
    },
    onSuccess: async (res) => {
      if (res?.accountCreated && password) {
        try {
          const { nestLoginWithPhone } = await import("@/lib/nest-auth");
          await nestLoginWithPhone(phone, password, "courier");
          cacheCourierKind(kind ?? "courier");
          await qc.invalidateQueries();
          qc.setQueryData(["my-courier-kind"], kind ?? "courier");
          toast.success("נרשמת בהצלחה! מעבר לאזור האישי...");
          setTimeout(() => navigate({ to: "/courier/new-jobs" }), 600);
          return;
        } catch {
          toast.success("נרשמת בהצלחה! התחבר עם הטלפון והסיסמה שלך");
          setTimeout(() => navigate({ to: "/courier-login" }), 600);
          return;
        }
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
    workAreas.length > 0 &&
    workCities.length > 0 &&
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
            הרשמה לשליחים של Goi
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            קבל הצעות עבודה ישירות בוואטסאפ — בלי אפליקציות, בלי התחייבות
          </p>
          {referredBy ? (
            <p className="mt-3 text-sm text-muted-foreground">
              עסק?{" "}
              <Link
                to="/signup-business"
                search={{ ref: referredBy }}
                className="font-bold text-primary underline underline-offset-4"
              >
                הרשמה לעסק דרך אותו קישור
              </Link>
            </p>
          ) : null}
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
            title="איפה אתה גר / בסיס יציאה"
            icon={MapPin}
            sub="עיר מגורים או נקודת היציאה שלך — לא אזורי העבודה"
          >
            <Input
              value={baseCity}
              onChange={(e) => setBaseCity(e.target.value)}
              placeholder="לדוגמה: תל אביב"
            />
          </Section>

          <Section
            n={3}
            title="אזורי עבודה"
            icon={MapPin}
            sub="איפה אתה מוכן לקחת משלוחים?"
          >
            <WorkAreaPicker
              selected={workAreas}
              onChange={setWorkAreas}
              cities={workCities}
              onCitiesChange={setWorkCities}
              error={
                (fullName.trim() || baseCity.trim())
                  ? workAreaSelectionError(workAreas, workCities)
                  : null
              }
            />
          </Section>

          {/* 4. Vehicle */}
          <Section n={4} title="עם מה אתה עובד?" icon={Bike} sub="אפשר לבחור יותר מכלי אחד">
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

          {/* Mover-only extras */}
          {kind === "mover" && (
            <Section n={"3א"} title="עובד לבד או עם צוות?" icon={Boxes} sub="חשוב לנו כדי להתאים לך עבודות בגודל הנכון">
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
          )}

          {/* 5. Invoice */}
          <Section n={5} title="יש לך חשבונית / קבלה?" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {INVOICE_OPTIONS.filter((i) => (kind === "mover" ? i.value !== "לא" : true)).map((i) => (
                <ChoiceCard key={i.value} active={invoice === i.value} onClick={() => setInvoice(i.value)} className={`justify-center flex-col ${i.sub ? "py-3" : ""}`}>
                  <span className="text-sm font-medium">{i.value}</span>
                  {i.sub && <span className="text-[11px] text-muted-foreground text-center leading-tight">{i.sub}</span>}
                </ChoiceCard>
              ))}
            </div>
          </Section>

          {/* 6. Password — for personal area */}
          <Section n={6} title="בחר סיסמה לאזור האישי שלך" icon={KeyRound} sub="עם המספר שלך + הסיסמה תוכל להיכנס לאזור האישי שלך באתר">
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
            className="w-full h-14 text-base font-bold rounded-xl bg-primary-deep hover:bg-primary-deep/90 text-primary-foreground shadow-lg gap-2"
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
