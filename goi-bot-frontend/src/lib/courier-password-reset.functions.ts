/**
 * Courier password reset — Nest Auth only.
 * Thin wrappers kept for any remaining imports; prefer nest-auth helpers in UI.
 */
import {
  nestConfirmCourierPasswordReset,
  nestRequestCourierPasswordReset,
} from "@/lib/nest-auth";

export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9) return "972" + digits;
  return digits;
}

export async function requestCourierPasswordReset(phone: string) {
  return nestRequestCourierPasswordReset(phone);
}

export async function confirmCourierPasswordReset(input: {
  phone: string;
  code: string;
  newPassword: string;
}) {
  return nestConfirmCourierPasswordReset(input);
}
