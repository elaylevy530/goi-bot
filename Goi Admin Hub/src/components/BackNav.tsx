import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn } from "lucide-react";

type BackNavProps = {
  className?: string;
  backTo?: "/";
  backLabel?: string;
  loginLabel?: string;
};

/**
 * Shared back-navigation header used across signup forms (business + courier).
 * Renders a "back to site" link on one side and a "already registered? log in" link on the other.
 */
export function BackNav({
  className = "",
  backTo = "/",
  backLabel = "חזרה לאתר",
  loginLabel = "כבר רשום? התחבר",
}: BackNavProps) {
  return (
    <div className={`flex items-center justify-between gap-2 mb-3 ${className}`}>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowRight className="size-4" />
        {backLabel}
      </Link>
      <Link
        to="/auth"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <LogIn className="size-4" />
        {loginLabel}
      </Link>
    </div>
  );
}

export default BackNav;
