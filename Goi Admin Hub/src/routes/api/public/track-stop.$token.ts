import { createFileRoute } from "@tanstack/react-router";
import { AppError, withHandler } from "@/lib/server-errors";

export const Route = createFileRoute("/api/public/track-stop/$token")({
  server: {
    handlers: {
      GET: withHandler("api.public.track_stop", async (ctx: { params: { token: string } }) => {
        const token = (ctx.params.token || "").trim();
        if (!token || token.length < 8 || token.length > 128) {
          throw new AppError("bad_request", { userMessage: "טוקן לא תקין" });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: stop, error } = await supabaseAdmin
          .from("job_stops")
          .select(
            "id, job_id, stop_order, stop_type, address, area, contact_name, status, arrived_at, done_at, package_description, number_of_packages",
          )
          .eq("public_token", token)
          .maybeSingle();
        if (error) {
          throw new AppError("internal", { internalMessage: error.message, cause: error });
        }
        if (!stop) {
          throw new AppError("not_found", { userMessage: "המשלוח לא נמצא" });
        }

        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("job_number, status, selected_courier_id, customer_name")
          .eq("id", stop.job_id)
          .maybeSingle();

        // How many dropoffs are still pending BEFORE this one (gives ETA hint)
        const { data: allDropoffs } = await supabaseAdmin
          .from("job_stops")
          .select("id, stop_order, status, stop_type")
          .eq("job_id", stop.job_id)
          .eq("stop_type", "dropoff")
          .order("stop_order");

        const beforeMe = (allDropoffs ?? []).filter(
          (s) => s.stop_order < stop.stop_order && s.status !== "done",
        ).length;

        let courier: { full_name: string; vehicle_type?: string | null; last_lat?: number | null; last_lng?: number | null } | null = null;
        if (job?.selected_courier_id) {
          const { data: c } = await supabaseAdmin
            .from("couriers")
            .select("full_name, vehicle_type, last_lat, last_lng, last_location_at")
            .eq("id", job.selected_courier_id)
            .maybeSingle();
          if (c) {
            courier = {
              full_name: c.full_name ?? "",
              vehicle_type: c.vehicle_type as string | null,
              last_lat: c.last_lat as number | null,
              last_lng: c.last_lng as number | null,
            };
          }
        }

        return new Response(
          JSON.stringify({
            job_number: job?.job_number,
            stop_status: stop.status,
            stop_type: stop.stop_type,
            address: stop.address,
            area: stop.area,
            contact_name: stop.contact_name,
            package_description: stop.package_description,
            number_of_packages: stop.number_of_packages,
            arrived_at: stop.arrived_at,
            done_at: stop.done_at,
            stops_before_me: beforeMe,
            courier,
          }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } },
        );
      }),
    },
  },
});
