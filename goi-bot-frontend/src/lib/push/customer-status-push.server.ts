export async function notifyCustomerJobStatus(..._args: unknown[]) {
  console.warn("Customer status push is owned by the Nest worker.");
  return { sent: 0, expired: 0 };
}
