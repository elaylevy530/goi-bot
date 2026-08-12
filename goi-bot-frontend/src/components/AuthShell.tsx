import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellProps = {
  /** Small line under GOI (e.g. "ברוכים הבאים למערכת המשלוחים") */
  tagline?: string;
  /** Card title (e.g. "התחברות") */
  title: string;
  /** Optional icon / element inside the white logo tile — defaults to "G" */
  logo?: ReactNode;
  /** Optional back-to-home link (default true) */
  showBackHome?: boolean;
  /** Card body */
  children: ReactNode;
  /** Optional block rendered below the card (footer links) */
  footer?: ReactNode;
  /** Force RTL. Default true. */
  rtl?: boolean;
};

/**
 * Native-app style auth screen: emerald hero at the top,
 * lifted white card with rounded top corners over it.
 * Used by all login/signup screens (customer, courier, business, admin).
 */
export function AuthShell({
  tagline = "ברוכים הבאים למערכת המשלוחים",
  title,
  logo,
  showBackHome = true,
  children,
  footer,
  rtl = true,
}: AuthShellProps) {
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-dvh w-full bg-bg flex flex-col font-sans"
    >
      {/* Green paints under the status bar; content sits below safe-area */}
      <div className="relative bg-primary shrink-0 pt-[env(safe-area-inset-top,0px)]">
        <div className="relative h-64 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full" />
          <div className="absolute top-20 -left-20 w-64 h-64 bg-black/10 rounded-full" />

          {showBackHome && (
            <Link
              to="/"
              aria-label="חזרה לדף הבית"
              className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white rounded-pill px-3 py-1.5 bg-white/15 backdrop-blur-sm ring-1 ring-white/25 transition"
            >
              <ArrowRight className="size-3.5" />
              דף הבית
            </Link>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-surface rounded-card flex items-center justify-center shadow-card-strong mb-4 rotate-6">
              <div className="-rotate-6 text-primary text-4xl font-black leading-none">
                {logo ?? "G"}
              </div>
            </div>
            <h1 className="text-white text-3xl font-black tracking-tight font-wordmark">
              GOI
            </h1>
            <p className="text-white/90 mt-1 text-sm font-light">{tagline}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 -mt-8 bg-surface rounded-t-[2.5rem] px-6 pt-8 shadow-card-strong z-20 mx-auto w-full max-w-md relative pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
        <h2 className="text-2xl font-bold text-text-strong mb-6">{title}</h2>
        {children}
        {footer && <div className="mt-8 pb-4 text-center">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Themed input group matching the AuthShell aesthetic.
 * Renders a rounded slate-50 pill wrapping the child input, with optional prefix.
 */
export function AuthField({
  label,
  htmlFor,
  action,
  prefix,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  action?: ReactNode;
  prefix?: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1 mr-1">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-bold text-text-muted"
        >
          {label}
        </label>
        {action}
      </div>
      <div className="flex items-center bg-muted border border-border rounded-card px-4 focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {prefix && (
          <span className="text-text-muted font-medium ml-3 text-sm tracking-wider" dir="ltr">
            {prefix}
          </span>
        )}
        {children}
      </div>
      {hint && <div className="mt-1.5">{hint}</div>}
    </div>
  );
}

/** Themed input to plug inside AuthField — plain <input>, no borders. */
export function AuthInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={
        "w-full py-4 bg-transparent outline-none text-text-strong font-medium text-base placeholder:text-text-muted/50 " +
        (props.className ?? "")
      }
    />
  );
}
