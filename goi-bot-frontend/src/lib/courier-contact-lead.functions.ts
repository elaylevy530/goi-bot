import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(20),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitCourierContactLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async () => {
    throw new Error("TODO Nest: expose a public courier-contact-lead endpoint.");
  });
