import type { WorkAreaCardId } from "@/lib/regions";
import { cn } from "@/lib/utils";

function iconClass(className?: string) {
  return cn("size-8", className);
}

export function ScooterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="14" cy="34" r="6" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="36" cy="34" r="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 34h12.5c2.2 0 3.4-2.6 2.2-4.4L24 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 22h6.5l3 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 22V13h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 13h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M10 30h28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 30 16.5 20.5A3 3 0 0 1 19.2 19h9.6a3 3 0 0 1 2.7 1.5L36 30" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M8 30h4l.8-2.2A3 3 0 0 1 15.6 26h16.8a3 3 0 0 1 2.8 1.8L36 30h4" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="16" cy="32.5" r="3.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="32" cy="32.5" r="3.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 19.5v6.5M28 19.5v6.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ElectricBikeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="14" cy="34" r="6" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="36" cy="34" r="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 34h8l4-10h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 24 30 34h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 24V16h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 12l-2.5 5h5L26 12Z" fill="currentColor" />
    </svg>
  );
}

export function RegionNorthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M6 36 18 16l8 12 6-9 10 17H6Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M18 16v-4M26 28V18M32 19v-5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function RegionSharonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M12 38V24m0 0c-4 0-6-3.2-6-7s3.2-6 6-6 6 2.2 6 6-2 7-6 7Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M24 38V20m0 0c-4.5 0-7-3.6-7-8s4-7 7-7 7 2.6 7 7-2.5 8-7 8Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M36 38V24m0 0c-4 0-6-3.2-6-7s3.2-6 6-6 6 2.2 6 6-2 7-6 7Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
    </svg>
  );
}

export function RegionCenterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M8 38V20h10v18" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M18 38V14h12v24" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M11 24h4M11 29h4M22 20h6M22 26h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 38V26c4 0 7-2.6 7-6s-3.4-5.5-7-5.5c-.4 0-.7 0-1 .1" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M34 22c2.4 0 4-1.4 4-3.2S36.4 16 34 16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function RegionShfelaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M6 34c6-8 10-8 16 0 6-8 10-8 16 0 2-3 4-3 6 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M6 40c6-8 10-8 16 0 6-8 10-8 16 0 2-3 4-3 6 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M24 28V12" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M24 16c-3.5-1-6 .4-8 3M24 16c3.5-1 6 .4 8 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RegionSouthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="24" cy="16" r="6" stroke="currentColor" strokeWidth="2.1" />
      <path d="M24 6v2.5M24 23.5V26M14.5 16H12M36 16h-2.5M16.8 8.8l1.8 1.8M29.4 21.4l1.8 1.8M16.8 23.2l1.8-1.8M29.4 10.6l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 34c4 4 8 4 12 0s8-4 12 0 8 4 12 0M8 40c4 4 8 4 12 0s8-4 12 0 8 4 12 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function RegionJerusalemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path d="M8 38V24h8v14M32 38V24h8v14" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M16 38V22c0-6.5 4-12 8-12s8 5.5 8 12v16" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M20 38V28h8v10" stroke="currentColor" strokeWidth="2" />
      <path d="M11 28h2M35 28h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const REGION_ICONS: Record<WorkAreaCardId, typeof RegionNorthIcon> = {
  north: RegionNorthIcon,
  sharon: RegionSharonIcon,
  center: RegionCenterIcon,
  shfela: RegionShfelaIcon,
  south: RegionSouthIcon,
  jerusalem: RegionJerusalemIcon,
};

export function WorkAreaRegionIcon({
  mapId,
  className,
}: {
  mapId: WorkAreaCardId;
  className?: string;
}) {
  const Icon = REGION_ICONS[mapId];
  return <Icon className={className} />;
}
