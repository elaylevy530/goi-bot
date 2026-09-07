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
      throw redirect({ to: "/business/dashboard" });
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
    title: "טוב שחזרת",
    subtitle: "המשלוחים של העסק מתחילים כאן",
    cta: "כניסה לעסק",
    footerLead: "עדיין לא הצטרפת?",
    footerAction: "פתיחת חשבון עסקי",
    footerTo: "/signup-business",
  },
  courier: {
    hero: courierHero,
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
    <div dir="rtl" className="relative isolate min-h-dvh overflow-hidden bg-[#111] font-sans text-white">
      <img
        key={role}
        src={copy.hero}
        alt=""
        width={1440}
        height={2560}
        decoding="async"
        fetchPriority="high"
        className="pointer-events-none absolute inset-0 size-full object-cover object-[center_22%]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/75 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6">
        <div className="relative flex h-11 items-center justify-center">
          <Link
            to="/"
            className="absolute start-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm"
          >
            <ArrowRight className="size-3" />
            דף הבית
          </Link>
          <div
            className="text-[22px] font-black tracking-[0.14em] text-white"
            style={{ fontFamily: "var(--font-wordmark)" }}
          >
            GOI
          </div>
        </div>

        <div className="mt-auto -mx-4 rounded-t-[1.75rem] bg-[#0b0b0b]/92 px-5 pb-3 pt-3.5 sm:-mx-6 sm:px-7">
          <div className="mb-3.5 grid grid-cols-2 gap-0.5 rounded-full bg-black/50 p-0.5 ring-1 ring-white/25">
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

          <h1 className="text-[22px] font-black leading-none">{copy.title}</h1>
          <p className="mt-1.5 text-[13px] text-white/70">{copy.subtitle}</p>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block text-start">
              <span className="mb-1 block text-[11px] font-bold text-white/75">מספר טלפון</span>
              <div className="relative flex items-center rounded-xl border border-white/30 bg-black/30 focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/30">
                <span
                  dir="ltr"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium tracking-wide text-white/55"
                >
                  +972
                </span>
                <span className="pointer-events-none absolute left-[3.85rem] top-1/2 h-4 w-px -translate-y-1/2 bg-white/25" />
                <input
                  id="auth-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="50-123-4567"
                  className="w-full bg-transparent py-2.5 pl-[4.75rem] pr-3.5 text-left text-[15px] font-medium text-white outline-none placeholder:text-white/35"
                />
              </div>
            </label>

            <label className="block text-start">
              <span className="mb-1 block text-[11px] font-bold text-white/75">סיסמה</span>
              <div className="flex items-center rounded-xl border border-white/30 bg-black/30 px-3.5 focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/30">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-right text-[15px] font-medium text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="me-0 ms-2 shrink-0 text-white/55 hover:text-white"
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {role === "courier" ? (
              <div className="-mt-0.5 text-start">
                <Link
                  to="/courier-reset-password"
                  className="text-[13px] font-bold text-[#00A86B] underline underline-offset-4"
                >
                  שכחתי סיסמה?
                </Link>
              </div>
            ) : (
              <div className="-mt-0.5 text-start">
                <span className="text-[13px] font-bold text-[#00A86B] underline underline-offset-4">
                  שכחתי סיסמה?
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative mt-0.5 flex h-12 w-full items-center justify-center rounded-xl bg-[#00A86B] text-[15px] font-black text-white transition active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : copy.cta}
              <span className="absolute left-1.5 grid size-9 place-items-center rounded-full bg-white/15">
                <ArrowRight className="size-3.5" />
              </span>
            </button>
          </form>

          <p className="mt-3.5 text-center text-[13px] text-white/65">
            {copy.footerLead}{" "}
            <Link
              to={copy.footerTo}
              className="font-bold text-[#00A86B] underline underline-offset-4"
            >
              {copy.footerAction}
            </Link>
          </p>

          <div className="mt-3 text-center">
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/70"
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
        "flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition",
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
