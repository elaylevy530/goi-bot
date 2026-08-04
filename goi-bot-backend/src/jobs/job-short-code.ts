import { randomBytes } from "crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Generate a 6-char short code (no ambiguous 0/O/1/l). */
export function generateJobShortCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}
