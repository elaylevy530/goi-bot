import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("972") ? digits : digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

export function customerPhoneToEmail(raw: string) {
  return `${normalizePhone(raw)}@customers.goi.local`;
}

const jobId = (data: unknown) => z.object({ id: z.string().uuid() }).parse(data);
const jobInput = (data: unknown) => z.object({ job_id: z.string().uuid() }).passthrough().parse(data);

type NestJob = {
  id: string;
  job_number?: string | number | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  selected_courier_id?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type NestConversation = {
  id: string;
  job_id?: string | null;
  courier_id?: string | null;
};

type NestChatMessage = {
  id: string;
  sender_role: string;
  body: string | null;
  created_at: string;
  [key: string]: unknown;
};

async function openJobConversation(
  accessToken: string,
  job: NestJob,
): Promise<NestConversation> {
  return nestServerFetch<NestConversation>("/api/chat/conversations", {
    method: "POST",
    accessToken,
    body: {
      kind: "courier_business",
      job_id: job.id,
      courier_id: job.selected_courier_id ?? undefined,
    },
  });
}

export const signupCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        phone: z.string().min(7),
        full_name: z.string().min(2).optional(),
        name: z.string().min(2).optional(),
        password: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return nestServerFetch("/api/auth/register/customer", {
      method: "POST",
      body: {
        phone: data.phone,
        full_name: data.full_name || data.name || "לקוח",
        password: data.password,
      },
    });
  });

export const getMyOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(({ context }) => nestServerFetch<any[]>("/api/jobs", { accessToken: context.accessToken }));

export const getMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(jobId)
  .handler(({ data, context }) =>
    nestServerFetch<any>(`/api/jobs/${data.id}`, { accessToken: context.accessToken }),
  );

export const cancelMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(jobId)
  .handler(({ data, context }) =>
    nestServerFetch(`/api/jobs/${data.id}`, {
      method: "PATCH",
      body: { status: "בוטלה" },
      accessToken: context.accessToken,
    }),
  );

export const repriceMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), price: z.number().positive().max(100000) }).parse(data),
  )
  .handler(({ data, context }) =>
    nestServerFetch(`/api/jobs/${data.id}/reprice`, {
      method: "POST",
      body: { price: data.price },
      accessToken: context.accessToken,
    }),
  );

export const updateCustomerProfileFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        full_name: z.string().min(2).max(80).optional(),
        name: z.string().min(2).max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const full_name = data.full_name || data.name;
    if (!full_name) throw new Error("full_name is required");
    return nestServerFetch("/api/auth/me/customer", {
      method: "PATCH",
      accessToken: context.accessToken,
      body: { full_name },
    });
  });

export const sendCourierMessageFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(jobInput)
  .handler(async ({ data, context }) => {
    const job = await nestServerFetch<NestJob>(`/api/jobs/${data.job_id}`, {
      accessToken: context.accessToken,
    });
    const conversation = await openJobConversation(context.accessToken, job);
    const message = typeof data.message === "string" ? data.message : "";
    return nestServerFetch(`/api/chat/conversations/${conversation.id}/messages`, {
      method: "POST",
      body: { body: message },
      accessToken: context.accessToken,
    });
  });

export const getMyQuotesFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(jobInput)
  .handler(({ data, context }) =>
    nestServerFetch<any[]>(`/api/jobs/${data.job_id}/quotes`, { accessToken: context.accessToken }),
  );

export const selectMyQuoteFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ job_id: z.string().uuid(), quote_id: z.string().uuid() }).parse(data),
  )
  .handler(({ data, context }) =>
    nestServerFetch(`/api/jobs/${data.job_id}/quotes/${data.quote_id}/select`, {
      method: "POST",
      accessToken: context.accessToken,
    }),
  );

/** Jobs with an assigned courier — UI keys threads by job id. */
export const getMyChatThreadsFn = createServerFn({ method: "GET" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    const jobs = await nestServerFetch<NestJob[]>("/api/jobs", {
      accessToken: context.accessToken,
    });
    return (jobs ?? [])
      .filter((j) => !!j.selected_courier_id)
      .map((j) => ({
        id: j.id,
        job_number: j.job_number,
        pickup_address: j.pickup_address,
        dropoff_address: j.dropoff_address,
        couriers: { full_name: null as string | null },
      }));
  });

export const getMyChatMessagesFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator(jobInput)
  .handler(async ({ data, context }) => {
    const job = await nestServerFetch<NestJob>(`/api/jobs/${data.job_id}`, {
      accessToken: context.accessToken,
    });
    const conversation = await openJobConversation(context.accessToken, job);
    const messages = await nestServerFetch<NestChatMessage[]>(
      `/api/chat/conversations/${conversation.id}/messages`,
      { accessToken: context.accessToken },
    );
    return {
      job,
      courier: null,
      messages: (messages ?? []).map((m) => ({
        ...m,
        direction: m.sender_role === "business" ? "outbound" : "inbound",
      })),
    };
  });

export const openSupportTicketFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((data: unknown) =>
    z.object({ message: z.string().min(2), job_id: z.string().uuid().optional().nullable() }).parse(data),
  )
  .handler(({ data, context }) =>
    nestServerFetch("/api/support/tickets", {
      method: "POST",
      body: data,
      accessToken: context.accessToken,
    }),
  );
