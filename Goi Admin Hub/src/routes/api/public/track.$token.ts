import { createFileRoute } from "@tanstack/react-router";
import { AppError, withHandler } from "@/lib/server-errors";

export const Route = createFileRoute("/api/public/track/$token")({
  server: {
    handlers: {
      GET: withHandler("api.public.track", async (ctx: { params: { token: string } }) => {
        const { params } = ctx;
        const token = (params.token || "").trim();
        if (!token || token.length < 8 || token.length > 128) {
          throw new AppError("bad_request", { userMessage: "טוקן מעקב לא תקין" });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: job, error } = await supabaseAdmin
          .from("jobs")
          .select(
            "job_number, job_type, status, delivery_status, courier_step, pickup_area, dropoff_area, pickup_address, dropoff_address, recipient_name, selected_courier_id",
          )
          .eq("recipient_tracking_token", token)
          .maybeSingle();
        if (error) {
          throw new AppError("internal", {
            internalMessage: `track lookup: ${error.message}`,
            cause: error,
          });
        }
        if (!job) {
          throw new AppError("not_found", { userMessage: "המשלוח לא נמצא" });
        }

        let courier: {
          full_name: string;
          whatsapp_phone: string | null;
          vehicle_type: string | null;
          last_lat: number | null;
          last_lng: number | null;
          last_location_at: string | null;
        } | null = null;
        if (job.selected_courier_id) {
          const { data: c, error: cErr } = await supabaseAdmin
            .from("couriers")
            .select("full_name, whatsapp_phone, vehicle_type, last_lat, last_lng, last_location_at")
            .eq("id", job.selected_courier_id)
            .maybeSingle();
          if (cErr) {
            // Non-fatal — show job without courier
            console.error("[api.public.track] courier fetch failed:", cErr.message);
          } else if (c) {
            courier = {
              full_name: c.full_name ?? "",
              whatsapp_phone: c.whatsapp_phone ?? null,
              vehicle_type: (c.vehicle_type as string | null) ?? null,
              last_lat: c.last_lat as number | null,
              last_lng: c.last_lng as number | null,
              last_location_at: c.last_location_at as string | null,
            };
          }
        }

        return new Response(
          JSON.stringify({
            job_number: job.job_number,
            job_type: job.job_type,
            status: job.status,
            delivery_status: job.delivery_status,
            courier_step: job.courier_step,
            pickup_area: job.pickup_area,
            dropoff_area: job.dropoff_area,
            pickup_address: job.pickup_address,
            dropoff_address: job.dropoff_address,
            recipient_name: job.recipient_name,
            courier,
          }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } },
        );
      }),
    },
  },
});
