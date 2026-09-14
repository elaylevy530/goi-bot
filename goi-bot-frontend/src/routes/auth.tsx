import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Bike,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import {
  fetchNestSession,
  nestHomePath,
  nestLoginWithPhone,
} from "@/lib/nest-auth";
import { cn } from "@/lib/utils";
import businessHero from "@/assets/auth/business-hero.jpg";
import courierHero from "@/assets/auth/courier-hero.jpg";

type Role = "courier" | "business";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "התחברות — Goi" }] }),
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    role: s.role === "business" ? "business" as const : undefined,
  }),
  beforeLoad: async () => {
    const session = await fetchNestSession();
    if (!session) return;
    const roles = session.roles ?? [];
    if (roles.includes("admin") || roles.includes("manager")) {
      throw redirect({ to: "/dashboard" });
    }
    if (roles.includes("courier")) {
      throw redirect({ to: "/courier/new-jobs" });
    }
    if (roles.includes("business")) {
      const niche = session.profile?.businessNiche ?? "manual_dispatch";
      if (niche === "restaurant") throw redirect({ to: "/restaurant" });
      if (niche === "online_store") throw redirect({ to: "/store" });
      if (niche === "pharmacy_clinic") throw redirect({ to: "/clinic" });
      throw redirect({ to: "/business/new-delivery" });
    }
    if (roles.includes("customer")) throw redirect({ to: "/customer/dashboard" });
    throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const COPY: Record<
  Role,
  {
    hero: string;
    heroPosition: string;
    title: string;
    subtitle: string;
    cta: string;
    footerLead: string;
    footerAction: string;
    footerTo: "/join" | "/signup-business";
  }
> = {
  business: {
    hero: businessHero,
    heroPosition: "object-[center_top]",
    title: "טוב שחזרת",
    subtitle: "המשלוחים של העסק מתחילים כאן",
    cta: "כניסה לעסק",
    footerLead: "עדיין לא הצטרפת?",
    footerAction: "פתיחת חשבון עסקי",
    footerTo: "/signup-business",
  },
  courier: {
    hero: courierHero,
    heroPosition: "object-[center_12%] md:object-[center_8%]",
    title: "טוב שחזרת",
    subtitle: "העבודות שלך מחכות כאן",
    cta: "כניסה לשליח",
    footerLead: "עדיין לא הצטרפת?",
    footerAction: "הרשמה כשליח",
    footerTo: "/join",
  },
};

function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(search.role === "business" ? "business" : "courier");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const copy = COPY[role];
  const setRoleAndUrl = (next: Role) => {
    setRole(next);
    void navigate({
      to: "/auth",
      search: next === "business" ? { role: "business" } : {},
      replace: true,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) return;
    setLoading(true);
    try {
      const session = await nestLoginWithPhone(phone, password, role);
      toast.success("ברוך הבא!", { duration: 1600 });
      if (role === "courier") {
        navigate({ to: "/courier/new-jobs", replace: true });
      } else {
        navigate({ to: nestHomePath(session), replace: true });
      }
    } catch (err) {
      toast.error(authErrorMessage(err, "טלפון או סיסמה שגויים"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="h-dvh overflow-hidden bg-[#111] font-sans text-white">
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden sm:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] md:max-w-none md:flex-row md:shadow-none">
        <div className="relative order-1 min-h-0 flex-1 md:order-2 md:min-h-full">
          <img
            key={role}
            src={copy.hero}
            alt=""
            width={1440}
            height={2560}
            decoding="async"
            fetchPriority="high"
            className={cn(
              "pointer-events-none absolute inset-0 size-full object-cover",
              copy.heroPosition,
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent md:bg-gradient-to-l md:from-black/35 md:via-transparent md:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/65 to-transparent md:hidden" />

          <div className="relative z-10 flex h-10 shrink-0 items-center justify-center px-3 pt-[max(0.2rem,env(safe-area-inset-top))] md:h-auto md:justify-start md:px-8 md:pt-[max(1.5rem,env(safe-area-inset-top))]">
            <Link
              to="/"
              className="absolute start-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30 md:start-8 md:top-[max(1.5rem,env(safe-area-inset-top))] md:translate-y-0"
            >
              <ArrowRight className="size-3" />
              דף הבית
            </Link>
            <div
              className="text-[18px] font-black tracking-[0.14em] text-white md:hidden"
              style={{ fontFamily: "var(--font-wordmark)" }}
            >
              GOI
            </div>
          </div>
        </div>

        <div className="relative z-10 order-2 w-full shrink-0 rounded-t-[1.5rem] bg-[#0b0b0b]/94 px-4 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2.5 max-h-[58vh] overflow-y-auto md:order-1 md:flex md:h-full md:max-h-none md:w-[min(28rem,44vw)] md:shrink-0 md:flex-col md:justify-center md:overflow-y-auto md:rounded-none md:bg-[#0b0b0b] md:px-8 md:py-10 md:pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:w-[min(32rem,46vw)] lg:px-10">
          <div
            className="mb-8 hidden text-[28px] font-black tracking-[0.14em] text-white md:block"
            style={{ fontFamily: "var(--font-wordmark)" }}
          >
            GOI
          </div>
          <div className="mb-2 grid grid-cols-2 gap-0.5 rounded-full bg-black/50 p-0.5 ring-1 ring-white/25 md:mb-6">
            <RoleTab
              active={role === "courier"}
              icon={Bike}
              label="שליח"
              onClick={() => setRoleAndUrl("courier")}
            />
            <RoleTab
              active={role === "business"}
              icon={Store}
              label="לקוח עסקי"
              onClick={() => setRoleAndUrl("business")}
            />
          </div>

          <h1 className="text-[20px] font-black leading-none md:text-[28px] lg:text-[32px]">{copy.title}</h1>
          <p className="mt-0.5 text-[12px] leading-snug text-white/70 md:mt-2 md:text-[15px]">{copy.subtitle}</p>

          <form onSubmit={submit} className="mt-2.5 space-y-2 md:mt-6 md:space-y-4">
            <label className="block text-start">
              <span className="mb-0.5 block text-[11px] font-bold text-white/75 md:text-[13px]">מספר טלפון</span>
              <div
                dir="ltr"
                className="flex h-11 items-center rounded-xl border border-white/30 bg-black/30 focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/30 md:h-12"
              >
                <span className="shrink-0 pl-3.5 pr-2 text-[16px] font-medium tracking-wide text-white/55">
                  +972
                </span>
                <span className="h-4 w-px shrink-0 bg-white/25" />
                <input
                  id="auth-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoCapitalize="off"
                  autoCorrect="off"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50-123-4567"
                  className="min-w-0 flex-1 bg-transparent py-2 pl-3 pr-3.5 text-left text-[16px] font-medium text-white outline-none placeholder:text-white/35"
                />
              </div>
            </label>

            <label className="block text-start">
              <span className="mb-0.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-white/75 md:text-[13px]">סיסמה</span>
                {role === "courier" ? (
                  <Link
                    to="/courier-reset-password"
                    className="text-[12px] font-bold text-[#00A86B] underline underline-offset-2"
                  >
                    שכחתי סיסמה?
                  </Link>
                ) : (
                  <span className="text-[12px] font-bold text-[#00A86B] underline underline-offset-2">
                    שכחתי סיסמה?
                  </span>
                )}
              </span>
              <div className="flex h-11 items-center rounded-xl border border-white/30 bg-black/30 ps-3.5 pe-1 focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/30 md:h-12">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-w-0 flex-1 bg-transparent py-2 text-start text-[16px] font-medium text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="grid size-10 shrink-0 place-items-center text-white/55 hover:text-white"
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="relative flex h-11 w-full items-center justify-center rounded-xl bg-[#00A86B] pe-3 ps-11 text-[15px] font-black text-white transition active:scale-[0.98] disabled:opacity-70 md:h-12 md:text-[16px]"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : copy.cta}
              <span className="absolute left-1.5 grid size-8 place-items-center rounded-full bg-white/15">
                <ArrowRight className="size-3.5" />
              </span>
            </button>
          </form>

          <p className="mt-2 text-center text-[12px] text-white/65 md:mt-5 md:text-[13px]">
            {copy.footerLead}{" "}
            <Link
              to={copy.footerTo}
              className="font-bold text-[#00A86B] underline underline-offset-4"
            >
              {copy.footerAction}
            </Link>
          </p>

          <div className="mt-1 text-center md:mt-3">
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-1 text-[10px] text-white/35 hover:text-white/70 md:text-[12px]"
            >
              <ShieldCheck className="size-3" />
              כניסת מנהל מערכת
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Bike;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-full px-1 text-[12px] font-bold whitespace-nowrap transition md:h-11 md:text-[13px]",
        active
          ? "bg-[#00A86B] text-white shadow-[0_0_14px_rgba(0,168,107,0.4)]"
          : "text-white/75 hover:text-white",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
