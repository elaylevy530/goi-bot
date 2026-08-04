import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/business")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: customer } = await supabase
      .from("customers")
      .select("id, business_niche")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!customer) {
      throw redirect({ to: "/signup-business" });
    }

    const niche = (customer as { business_niche?: string }).business_niche ?? "manual_dispatch";
    if (niche === "restaurant") throw redirect({ to: "/restaurant" });
    if (niche === "online_store") throw redirect({ to: "/store" });
    if (niche === "pharmacy_clinic") throw redirect({ to: "/clinic" });


    if (location.pathname === "/business" || location.pathname === "/business/") {
      throw redirect({ to: "/business/dashboard" });
    }

    return { user: data.user, businessId: customer.id as string };
  },
  component: () => <Outlet />,
});
