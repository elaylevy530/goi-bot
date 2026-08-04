import { createServerFn } from "@tanstack/react-start";

/**
 * Grant admin role to the currently signed-in user if no admin exists yet.
 * Safe to call after every signup; it self-disables once a first admin is in place.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { head: true, count: "exact" })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);

    if ((count ?? 0) > 0) return { granted: false };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "admin" });
    if (error) throw new Error(error.message);

    return { granted: true };
  });
