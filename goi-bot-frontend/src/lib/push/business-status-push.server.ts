export async function notifyBusinessJobStatus(..._args: unknown[]) {
  console.warn("Business status push is owned by the Nest worker.");
  return { sent: 0, expired: 0 };
}
