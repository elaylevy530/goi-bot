/**
 * Courier account provisioning — Nest Auth only.
 * Prefer `nestProvisionCourier` from nest-auth in UI components.
 */
import { nestProvisionCourier } from "@/lib/nest-auth";

export function phoneToEmail(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.startsWith("972")
    ? digits
    : digits.startsWith("0")
      ? "972" + digits.slice(1)
      : digits;
  return `${normalized}@couriers.goi.local`;
}

export async function provisionCourierAccount(id: string) {
  return nestProvisionCourier(id);
}
