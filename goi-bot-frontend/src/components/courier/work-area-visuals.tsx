import type { WorkAreaCardId } from "@/lib/regions";
import { cn } from "@/lib/utils";

function iconClass(className?: string) {
  return cn("size-8", className);
}

type IconProps = { className?: string };

/** Sedan / private car */
export function CarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path
        d="M9 29.5h30M11.5 29.5 16 20.8A3.2 3.2 0 0 1 18.9 19h10.2a3.2 3.2 0 0 1 2.9 1.8L36.5 29.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 29.5h3.2l.9-2.4A2.8 2.8 0 0 1 14.7 25h18.6a2.8 2.8 0 0 1 2.6 1.7l1 2.8H40"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="33" r="3.3" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="31.5" cy="33" r="3.3" stroke="currentColor" strokeWidth="2.2" />
      <path d="M21 19.8v5.8M27.5 19.8v5.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Commercial van / cargo vehicle */
export function CommercialVanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <path
        d="M8 31.5V18.5A2.5 2.5 0 0 1 10.5 16H27v15.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M27 16h5.2a3 3 0 0 1 2.6 1.5L40 28.5v3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M8 31.5h32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 16v15.5M11 22h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="34.2" r="3.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="34" cy="34.2" r="3.2" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** Regular bicycle */
export function BikeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="13.5" cy="33" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="34.5" cy="33" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13.5 33 22 21.5h9.5L34.5 33" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M22 21.5 17 33M24.5 21.5 28.5 33" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20.5 21.5h12.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M31.5 21.5V16.5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 18.5h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Electric bicycle — bicycle plus charge mark */
export function ElectricBikeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="13.5" cy="33" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="34.5" cy="33" r="6.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13.5 33 22 21.5h9.5L34.5 33" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M22 21.5 17 33M24.5 21.5 28.5 33" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20.5 21.5h12.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M31.5 21.5V16.5h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 11.5 21 17h5.5L23.5 22" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Standing electric kick scooter */
export function KickScooterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="14" cy="35" r="5.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="35" cy="35" r="5.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 35h18.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32.5 35 30 14.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24.5 14.5h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 10 21.2 15.5h5.2L23.6 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Seated moped / קטנוע */
export function ScooterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={iconClass(className)} aria-hidden>
      <circle cx="14" cy="34.5" r="5.6" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="35" cy="34.5" r="5.6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 34.5h10.5c2.4 0 3.6-2.8 2.2-4.7L22.5 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 25.5h12l4 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 22V13.5h9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 13.5h16" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M22.5 22h8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const VEHICLE_ICON_BY_VALUE: Record<string, typeof CarIcon> = {
  רכב: CarIcon,
  "רכב מסחרי": CommercialVanIcon,
  טנדר: CommercialVanIcon,
  "אופניים חשמליים": ElectricBikeIcon,
  "אופניים רגילים": BikeIcon,
  אופניים: BikeIcon,
  "קורקינט חשמלי": KickScooterIcon,
  קורקינט: KickScooterIcon,
  קטנוע: ScooterIcon,
  אופנוע: ScooterIcon,
};

export function CourierVehicleIcon({ value, className }: { value: string; className?: string }) {
  const Icon = VEHICLE_ICON_BY_VALUE[value] ?? CarIcon;
  return <Icon className={className} />;
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
