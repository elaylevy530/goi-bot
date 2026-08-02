import { Controller, Get, Header, Param } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { AppError } from "../common/errors/app.error";
import { Job } from "../jobs/entities/job.entity";
import { JobStop } from "../jobs/entities/job-stop.entity";

function assertValidToken(token: string, userMessage: string): string {
  const trimmed = (token || "").trim();
  if (!trimmed || trimmed.length < 8 || trimmed.length > 128) {
    throw new AppError("bad_request", { userMessage });
  }
  return trimmed;
}

/**
 * Public tracking links shared with recipients. Same paths as TanStack:
 * `/api/public/track/:token` and `/api/public/track-stop/:token`.
 * Ported from track.$token.ts / track-stop.$token.ts using TypeORM.
 */
@Controller("api/public")
export class TrackingController {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(JobStop) private readonly jobStops: Repository<JobStop>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
  ) {}

  @Get("track/:token")
  @Header("Cache-Control", "no-store")
  async track(@Param("token") tokenParam: string) {
    const token = assertValidToken(tokenParam, "טוקן מעקב לא תקין");

    const job = await this.jobs.findOne({
      where: { recipient_tracking_token: token },
      select: [
        "job_number",
        "job_type",
        "status",
        "delivery_status",
        "courier_step",
        "pickup_area",
        "dropoff_area",
        "pickup_address",
        "dropoff_address",
        "recipient_name",
        "selected_courier_id",
      ],
    });
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
      const c = await this.couriers.findOne({
        where: { id: job.selected_courier_id },
        select: ["full_name", "whatsapp_phone", "vehicle_type", "last_lat", "last_lng", "last_location_at"],
      });
      if (c) {
        courier = {
          full_name: c.full_name ?? "",
          whatsapp_phone: c.whatsapp_phone ?? null,
          vehicle_type: c.vehicle_type ?? null,
          last_lat: c.last_lat,
          last_lng: c.last_lng,
          last_location_at: c.last_location_at ? c.last_location_at.toISOString() : null,
        };
      }
    }

    return {
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
    };
  }

  @Get("track-stop/:token")
  @Header("Cache-Control", "no-store")
  async trackStop(@Param("token") tokenParam: string) {
    const token = assertValidToken(tokenParam, "טוקן לא תקין");

    const stop = await this.jobStops.findOne({ where: { public_token: token } });
    if (!stop) {
      throw new AppError("not_found", { userMessage: "המשלוח לא נמצא" });
    }

    const job = await this.jobs.findOne({
      where: { id: stop.job_id },
      select: ["job_number", "status", "selected_courier_id", "customer_name"],
    });

    const allDropoffs = await this.jobStops.find({
      where: { job_id: stop.job_id, stop_type: "dropoff" },
      order: { stop_order: "ASC" },
      select: ["id", "stop_order", "status", "stop_type"],
    });
    const stopsBeforeMe = allDropoffs.filter(
      (s) => s.stop_order < stop.stop_order && s.status !== "done",
    ).length;

    let courier: {
      full_name: string;
      vehicle_type?: string | null;
      last_lat?: number | null;
      last_lng?: number | null;
    } | null = null;
    if (job?.selected_courier_id) {
      const c = await this.couriers.findOne({
        where: { id: job.selected_courier_id },
        select: ["full_name", "vehicle_type", "last_lat", "last_lng", "last_location_at"],
      });
      if (c) {
        courier = {
          full_name: c.full_name ?? "",
          vehicle_type: c.vehicle_type,
          last_lat: c.last_lat,
          last_lng: c.last_lng,
        };
      }
    }

    return {
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
      stops_before_me: stopsBeforeMe,
      courier,
    };
  }
}
