import { randomBytes } from "crypto";
import type { Repository } from "typeorm";
import type { Courier } from "./entities/courier.entity";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export async function allocateReferralCode(
  couriers: Repository<Courier>,
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateReferralCode();
    const exists = await couriers.exist({ where: { referral_code: code } });
    if (!exists) return code;
  }
  throw new Error("Failed to allocate referral_code");
}

export async function ensureCourierReferralCode(
  couriers: Repository<Courier>,
  courier: Courier,
): Promise<Courier> {
  if (courier.referral_code?.trim()) return courier;
  courier.referral_code = await allocateReferralCode(couriers);
  return couriers.save(courier);
}

/** Resolve /join?ref= against referral_code or courier id (legacy UUID links). */
export async function findCourierByReferralToken(
  couriers: Repository<Courier>,
  raw: string,
): Promise<Courier | null> {
  const token = raw.trim();
  if (!token) return null;
  if (isUuid(token)) {
    const byId = await couriers.findOne({ where: { id: token } });
    if (byId) return byId;
  }
  const upper = token.toUpperCase();
  const byCode = await couriers.findOne({ where: { referral_code: upper } });
  if (byCode) return byCode;
  if (upper !== token) {
    return couriers.findOne({ where: { referral_code: token } });
  }
  return null;
}
