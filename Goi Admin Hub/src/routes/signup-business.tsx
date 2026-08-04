import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { signupBusiness } from "@/lib/business-account.functions";
import {
  BUSINESS_CATEGORIES,
  SERVICE_TYPE_LABELS,
  type BusinessCategory,
  type ServiceType,
} from "@/config/businessCategories";
import { toast } from "sonner";
import { AuthShell, AuthField, AuthInput } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ArrowLeft, Building2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/signup-business")({
  head: () => ({
    meta: [
      { title: "הרשמת עסק — Goi" },
      { name: "description", content: "פתחו חשבון עסקי ב-Goi: בחרו את קטגוריית העסק שלכם, קבלו טופס משלוח מותאם ותחילת עבודה בדקות." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  ssr: false,
  component: SignupBusinessPage,
});

const GROUP_STYLES: Record<ServiceType, { bg: string; ring: string; label: string }> = {
  couriers: { bg: "from-[#FFF8DA] to-[#FFF1B0]", ring: "ring-[#F5C518]", label: "שליחים" },
  moving:   { bg: "from-[#E4F0FF] to-[#CFE1FB]", ring: "ring-[#3B82F6]", label: "הובלה" },
  mixed:    { bg: "from-[#F1E7FF] to-[#E1CBFF]", ring: "ring-[#8B5CF6]", label: "מעורב" },
};

type Step = 1 | 2;

function SignupBusinessPage() {
  const navigate = useNavigate();
  const signup = useServerFn(signupBusiness);

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<BusinessCategory | null>(null);

  // Details
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const mutate = useMutation({
    mutationFn: async () => {
      if (!category) throw new Error("בחר קטגוריה");
      return signup({
        data: {
          full_name: fullName,
          business_name: businessName,
          phone,
          email,
          city,
          password,
          business_category: category.key,
          service_type: category.serviceType,
          terms_accepted: true as const,
        },
      });
    },
    onSuccess: async () => {
      toast.success("החשבון נפתח! מתחברים...");
      // Auto sign-in with the credentials just created
      const normalized = phone.replace(/\D/g, "").replace(/^0/, "972");
      const loginEmail = email && email.trim() ? email.trim() : `${normalized}@business.goi.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (error) {
        navigate({ to: "/business-login" });
        return;
      }
      navigate({ to: "/business/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = useMemo(
    () =>
      !!category &&
      fullName.trim().length >= 2 &&
      businessName.trim().length >= 2 &&
      phone.trim().length >= 7 &&
      password.length >= 6 &&
      terms,
    [category, fullName, businessName, phone, password, terms],
  );

  return (
    <AuthShell
      title={step === 1 ? "בחרו את סוג העסק" : "פרטי החשבון"}
      tagline="פתיחת חשבון עסקי — משלוחים בלחיצה"
      logo="G"
      footer={
        <p className="text-sm text-muted-foreground">
          יש כבר חשבון?{" "}
          <Link to="/auth" className="text-primary font-bold underline underline-offset-4">
            כניסה
          </Link>
        </p>
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <StepDot n={1} active={step === 1} done={step > 1} label="קטגוריה" />
        <div className="flex-1 h-[2px] bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full bg-primary transition-all ${step >= 2 ? "w-full" : "w-0"}`} />
        </div>
        <StepDot n={2} active={step === 2} label="פרטים" />
      </div>

      {step === 1 && (
        <CategoryStep
          selected={category}
          onSelect={setCategory}
          onContinue={() => category && setStep(2)}
        />
      )}

      {step === 2 && category && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            mutate.mutate();
          }}
          className="space-y-4"
        >
          {/* Selected category summary */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white grid place-items-center text-2xl shadow-sm">
              {category.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground font-bold">הקטגוריה שנבחרה</div>
              <div className="text-sm font-black text-foreground truncate">{category.label}</div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[12px] font-bold text-primary underline underline-offset-4"
            >
              שנה
            </button>
          </div>

          <AuthField label="שם מלא (בעל/ת החשבון)" htmlFor="b-name">
            <AuthInput
              id="b-name" required autoComplete="name"
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="ישראל ישראלי"
            />
          </AuthField>

          <AuthField label="שם העסק" htmlFor="b-biz">
            <AuthInput
              id="b-biz" required
              value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder='למשל: "פרחי דנה"'
            />
          </AuthField>

          <AuthField label="טלפון" htmlFor="b-phone" prefix="+972">
            <AuthInput
              id="b-phone" type="tel" inputMode="tel" dir="ltr" required
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="50-123-4567"
            />
          </AuthField>

          <AuthField label="אימייל (אופציונלי)" htmlFor="b-email">
            <AuthInput
              id="b-email" type="email" dir="ltr"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.co.il"
            />
          </AuthField>

          <AuthField label="עיר (אופציונלי)" htmlFor="b-city">
            <AuthInput
              id="b-city"
              value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="תל אביב"
            />
          </AuthField>

          <AuthField label="סיסמה" htmlFor="b-pwd" hint={
            <div className="text-[11px] text-muted-foreground">לפחות 6 תווים</div>
          }>
            <AuthInput
              id="b-pwd" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </AuthField>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox" checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              אני מאשר/ת את תנאי השירות ומדיניות הפרטיות של Goi ומסכים/ה לפתיחת חשבון עסקי.
            </span>
          </label>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-14 px-5 rounded-2xl bg-slate-100 text-foreground font-bold text-sm"
            >
              חזרה
            </button>
            <Button
              type="submit"
              disabled={!canSubmit || mutate.isPending}
              className="flex-1 h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition"
            >
              {mutate.isPending && <Loader2 className="size-4 animate-spin ml-2" />}
              פתיחת חשבון עסקי
            </Button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground pt-2 pb-6">
            <Sparkles className="size-3 inline -mt-0.5" /> הטופס והמסכים יותאמו אוטומטית לקטגוריה שבחרתם.
          </p>
        </form>
      )}
    </AuthShell>
  );
}

function StepDot({ n, active, done, label }: { n: number; active?: boolean; done?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-7 rounded-full grid place-items-center text-[12px] font-black ring-2 transition ${
        done ? "bg-primary text-white ring-primary" :
        active ? "bg-primary/10 text-primary ring-primary" :
        "bg-slate-50 text-slate-400 ring-slate-200"
      }`}>
        {done ? <Check className="size-3.5" /> : n}
      </div>
      <span className={`text-[11px] font-bold ${active || done ? "text-foreground" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function CategoryStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: BusinessCategory | null;
  onSelect: (c: BusinessCategory) => void;
  onContinue: () => void;
}) {
  const groups: ServiceType[] = ["couriers", "mixed", "moving"];
  return (
    <div className="space-y-5 pb-4">
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-start gap-2">
        <Building2 className="size-4 mt-0.5 text-primary shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          בחרו קטגוריה שמתאימה לעסק — היא קובעת אילו סוגי משלוח, זמנים ומאפיינים יופיעו בטופס
          שלכם. <span className="font-bold text-foreground">אפשר לשנות בהמשך רק דרך התמיכה.</span>
        </p>
      </div>

      {groups.map((g) => {
        const cats = BUSINESS_CATEGORIES.filter((c) => c.serviceType === g);
        const style = GROUP_STYLES[g];
        const meta = SERVICE_TYPE_LABELS[g];
        return (
          <section key={g}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-base">{meta.emoji}</span>
              <h2 className="text-[13px] font-black text-foreground">{style.label}</h2>
              <span className="text-[10px] text-muted-foreground">— {cats.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {cats.map((c) => {
                const active = selected?.key === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onSelect(c)}
                    className={`relative rounded-2xl bg-gradient-to-br ${style.bg} p-3 text-right transition active:scale-[0.98] ${
                      active ? `ring-2 ${style.ring} shadow-md` : "ring-1 ring-black/5"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 left-2 size-5 rounded-full bg-[#101418] grid place-items-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                    <div className="text-2xl mb-1">{c.emoji}</div>
                    <div className="text-[13px] font-black text-[#101418] leading-tight">{c.label}</div>
                    <div className="text-[10px] text-[#101418]/60 mt-0.5">
                      {c.deliveryTypes.length} סוגי משלוח
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 pt-2">
        <button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-[15px] shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          המשך לפרטי חשבון <ArrowLeft className="size-5" />
        </button>
      </div>
    </div>
  );
}
