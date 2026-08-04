import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const setPlatformSettingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      key: z.string().min(1),
      value: z.any(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    // Admin only
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { error } = await supabase
      .from("platform_settings")
      .upsert({
        key: data.key,
        value: data.value,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
