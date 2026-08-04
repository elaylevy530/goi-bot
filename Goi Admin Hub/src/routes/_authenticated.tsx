import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Verify admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      // Business user → business panel
      const { data: business } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (business) throw redirect({ to: "/business" });

      // Courier → courier portal
      const { data: courier } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (courier) throw redirect({ to: "/courier" });

      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
