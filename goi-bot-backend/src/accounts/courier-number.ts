import { randomInt } from "crypto";
import type { Repository } from "typeorm";
import type { Courier } from "./entities/courier.entity";

/** Public 6-digit courier id. Never recycled while the row exists. */
const MIN = 100000;
const MAX = 999999;

export async function allocateCourierNumber(
  couriers: Repository<Courier>,
): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = String(randomInt(MIN, MAX + 1));
    const exists = await couriers.exist({ where: { courier_number: code } });
    if (!exists) return code;
  }
  throw new Error("Failed to allocate courier_number");
}

export async function ensureCourierNumber(
  couriers: Repository<Courier>,
  courier: Courier,
): Promise<Courier> {
  if (courier.courier_number?.trim()) return courier;
  courier.courier_number = await allocateCourierNumber(couriers);
  return couriers.save(courier);
}
