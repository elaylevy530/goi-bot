import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  job_id: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(15),
});

export type MatchReason = { label: string; points: number };
export type CourierMatch = {
  courier_id: string;
  full_name: string;
  whatsapp_phone: string;
  vehicle_label: string | null;
  base_city: string | null;
  score: number;
  acceptance_rate: number | null;
  on_time_rate: number | null;
  avg_rating: number | null;
  jobs_completed: number;
  reasons: MatchReason[];
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const findMatchingCouriers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.job_id)
      .single();
    if (jobErr || !job) throw new Error("Job not found");

    // Fetch active couriers
    const { data: couriers, error: cErr } = await supabase
      .from("couriers")
      .select("*")
      .in("courier_status", ["פעיל", "חדש"])
      .eq("is_paused", false);
    if (cErr) throw cErr;

    // Stats for those couriers
    const ids = (couriers ?? []).map((c) => c.id);
    const { data: stats } = ids.length
      ? await supabase.from("courier_stats").select("*").in("courier_id", ids)
      : { data: [] as any[] };
    const statsMap = new Map((stats ?? []).map((s: any) => [s.courier_id, s]));

    // Active load: count open offers / in-progress jobs per courier
    const { data: activeJobs } = ids.length
      ? await supabase
          .from("jobs")
          .select("selected_courier_id")
          .in("selected_courier_id", ids)
          .in("status", ["שובץ", "בדרך לאיסוף", "באיסוף", "במסירה"] as any)
      : { data: [] as any[] };
    const loadMap = new Map<string, number>();
    (activeJobs ?? []).forEach((j: any) => {
      if (!j.selected_courier_id) return;
      loadMap.set(j.selected_courier_id, (loadMap.get(j.selected_courier_id) ?? 0) + 1);
    });

    const matches: CourierMatch[] = (couriers ?? []).map((c: any) => {
      const reasons: MatchReason[] = [];
      let score = 0;

      // 1. Geographic proximity
      if (job.pickup_lat && job.pickup_lng && c.home_lat && c.home_lng) {
        const km = haversineKm(
          Number(job.pickup_lat),
          Number(job.pickup_lng),
          Number(c.home_lat),
          Number(c.home_lng),
        );
        if (km <= 3) {
          score += 30;
          reasons.push({ label: `קרוב מאוד לאיסוף (${km.toFixed(1)} ק"מ)`, points: 30 });
        } else if (km <= 10) {
          score += 20;
          reasons.push({ label: `קרוב לאיסוף (${km.toFixed(1)} ק"מ)`, points: 20 });
        } else if (km <= 25) {
          score += 10;
          reasons.push({ label: `בטווח סביר (${km.toFixed(1)} ק"מ)`, points: 10 });
        }
      } else if (job.pickup_area) {
        const pickup = job.pickup_area;
        const pickupAreas: string[] = c.pickup_areas ?? [];
        const workAreas: string[] = c.working_areas ?? [];
        const allAreas = [...pickupAreas, ...workAreas, c.base_city, c.custom_work_area, c.custom_pickup_area].filter(Boolean) as string[];
        if (allAreas.some((a) => a === pickup || pickup.includes(a) || a.includes(pickup))) {
          score += 25;
          reasons.push({ label: `עובד באזור איסוף ${pickup}`, points: 25 });
        }
      }

      // 2. Dropoff area overlap
      if (job.dropoff_area) {
        const drop = job.dropoff_area;
        const dropAreas: string[] = c.dropoff_areas ?? [];
        const workAreas: string[] = c.working_areas ?? [];
        const allDrop = [...dropAreas, ...workAreas, c.custom_dropoff_area].filter(Boolean) as string[];
        if (allDrop.some((a) => a === drop || drop.includes(a) || a.includes(drop))) {
          score += 10;
          reasons.push({ label: `עובד באזור מסירה ${drop}`, points: 10 });
        }
      }

      // 3. Vehicle match
      if (job.vehicle_required) {
        const vehicles: string[] = c.vehicle_types ?? [];
        if (vehicles.includes(job.vehicle_required) || c.vehicle_type === job.vehicle_required) {
          score += 15;
          reasons.push({ label: `רכב מתאים: ${job.vehicle_required}`, points: 15 });
        } else {
          score -= 20;
          reasons.push({ label: `אין רכב מתאים`, points: -20 });
        }
      }

      // 4. Job type preference
      const jobTypes: string[] = c.job_types ?? [];
      const preferred: string[] = c.preferred_job_types ?? [];
      if (preferred.includes(job.job_type)) {
        score += 12;
        reasons.push({ label: `סוג עבודה מועדף: ${job.job_type}`, points: 12 });
      } else if (jobTypes.includes(job.job_type)) {
        score += 6;
        reasons.push({ label: `מבצע ${job.job_type}`, points: 6 });
      }

      // 5. Special requirements
      if (job.requires_thermal_bag) {
        if (c.has_thermal_bag) {
          score += 8;
          reasons.push({ label: "יש תיק תרמי", points: 8 });
        } else {
          score -= 15;
          reasons.push({ label: "אין תיק תרמי", points: -15 });
        }
      }

      // 6. Performance history
      const st: any = statsMap.get(c.id);
      if (st) {
        if (st.acceptance_rate != null) {
          const bonus = Math.round((Number(st.acceptance_rate) - 50) / 5);
          if (bonus !== 0) {
            score += bonus;
            reasons.push({ label: `אחוז קבלת הצעות: ${Number(st.acceptance_rate).toFixed(0)}%`, points: bonus });
          }
        }
        if (st.on_time_rate != null && Number(st.on_time_rate) >= 80) {
          score += 8;
          reasons.push({ label: `עומד בזמנים (${Number(st.on_time_rate).toFixed(0)}%)`, points: 8 });
        }
        if (st.avg_rating != null && Number(st.avg_rating) >= 4.5) {
          score += 5;
          reasons.push({ label: `דירוג גבוה (${Number(st.avg_rating).toFixed(1)}★)`, points: 5 });
        }
      } else {
        reasons.push({ label: "שליח חדש — אין היסטוריה", points: 0 });
      }

      // 7. Current load penalty
      const load = loadMap.get(c.id) ?? 0;
      if (load >= 2) {
        const penalty = -load * 8;
        score += penalty;
        reasons.push({ label: `עומס נוכחי: ${load} משלוחים פעילים`, points: penalty });
      } else if (load === 0) {
        score += 3;
        reasons.push({ label: "פנוי כרגע", points: 3 });
      }

      return {
        courier_id: c.id,
        full_name: c.full_name,
        whatsapp_phone: c.whatsapp_phone,
        vehicle_label: c.vehicle_label,
        base_city: c.base_city,
        score,
        acceptance_rate: st?.acceptance_rate != null ? Number(st.acceptance_rate) : null,
        on_time_rate: st?.on_time_rate != null ? Number(st.on_time_rate) : null,
        avg_rating: st?.avg_rating != null ? Number(st.avg_rating) : null,
        jobs_completed: st?.jobs_completed ?? 0,
        reasons: reasons.sort((a, b) => b.points - a.points),
      };
    });

    matches.sort((a, b) => b.score - a.score);

    return {
      matches: matches.slice(0, data.limit),
      job_summary: {
        job_number: job.job_number,
        job_type: job.job_type,
        pickup_area: job.pickup_area,
        dropoff_area: job.dropoff_area,
        vehicle_required: job.vehicle_required,
      },
    };
  });
