import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
  ctaLabel,
  ctaTo,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="empty-state">
      <Icon className="size-6" />
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
      {action}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo as never} className="btn primary">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
