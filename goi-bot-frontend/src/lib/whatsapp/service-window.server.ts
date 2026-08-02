const WINDOW_MS = 24 * 60 * 60 * 1000;
const inboundAt = new Map<string, number>();

export async function isServiceWindowOpen(phone: string): Promise<boolean> {
  const receivedAt = inboundAt.get(phone);
  return receivedAt !== undefined && Date.now() - receivedAt < WINDOW_MS;
}

export async function recordInboundMessage(phone: string, _provider: "green" | "cloud" = "green") {
  if (phone) inboundAt.set(phone, Date.now());
}
