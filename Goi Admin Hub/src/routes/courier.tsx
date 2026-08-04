import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courier")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/courier-login" });

    const { data: courier } = await supabase
      .from("couriers")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!courier) {
      throw redirect({ to: "/join" });
    }


    // Courier home is the new-jobs map / available jobs screen.
    if (location.pathname === "/courier" || location.pathname === "/courier/") {
      throw redirect({ to: "/courier/new-jobs" });
    }

    return { user: data.user, courierId: courier.id as string };
  },
  component: () => <Outlet />,
});
