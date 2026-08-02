import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import type { AppRole } from "../auth/auth.types";
import { Job } from "../jobs/entities/job.entity";
import type { CreateMunchOrderDto } from "./dto/create-munch-order.dto";
import { Kiosk } from "./entities/kiosk.entity";
import { KioskCategory } from "./entities/kiosk-category.entity";
import { KioskProduct } from "./entities/kiosk-product.entity";
import { MunchOrder } from "./entities/munch-order.entity";

function generateJobNumber(): string {
  return `J-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function generateTrackingToken(): string {
  return randomBytes(16).toString("hex");
}

@Injectable()
export class MunchService {
  constructor(
    @InjectRepository(Kiosk) private readonly kiosks: Repository<Kiosk>,
    @InjectRepository(KioskCategory) private readonly categories: Repository<KioskCategory>,
    @InjectRepository(KioskProduct) private readonly products: Repository<KioskProduct>,
    @InjectRepository(MunchOrder) private readonly orders: Repository<MunchOrder>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
  ) {}

  listKiosks() {
    return this.kiosks.find({
      where: { is_active: true },
      order: { rating: "DESC" },
    });
  }

  async getMenu(kioskId: string) {
    const [kiosk, categories, products] = await Promise.all([
      this.kiosks.findOne({ where: { id: kioskId } }),
      this.categories.find({ order: { sort_order: "ASC" } }),
      this.products.find({
        where: { kiosk_id: kioskId, is_available: true },
        order: { sort_order: "ASC" },
      }),
    ]);
    return { kiosk, categories, products };
  }

  async createOrder(userId: string, dto: CreateMunchOrderDto) {
    if (!dto.items?.length) throw new BadRequestException("הסל ריק");

    const kiosk = await this.kiosks.findOne({ where: { id: dto.kiosk_id } });
    if (!kiosk) throw new NotFoundException("קיוסק לא נמצא");

    const subtotal = dto.items.reduce(
      (s, it) => s + Number(it.price) * Number(it.qty),
      0,
    );
    const deliveryFee = Number(kiosk.delivery_fee_default ?? 15);
    const serviceFee = Number(kiosk.service_fee_default ?? 3);
    const total = subtotal + deliveryFee + serviceFee;

    const inserted = await this.orders.save(
      this.orders.create({
        user_id: userId,
        kiosk_id: dto.kiosk_id,
        items: dto.items,
        subtotal: String(subtotal),
        delivery_fee: String(deliveryFee),
        service_fee: String(serviceFee),
        total: String(total),
        dropoff_address: dto.dropoff_address,
        dropoff_lat: dto.dropoff_lat != null ? String(dto.dropoff_lat) : null,
        dropoff_lng: dto.dropoff_lng != null ? String(dto.dropoff_lng) : null,
        notes: dto.notes ?? null,
        status: "pending",
      }),
    );

    return {
      id: inserted.id,
      total: Number(inserted.total),
      status: inserted.status,
      kiosk_id: inserted.kiosk_id,
    };
  }

  async getOrder(id: string, userId: string, roles: AppRole[]) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) return null;

    const isAdmin = roles.includes("admin") || roles.includes("manager");
    if (order.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("Not allowed");
    }

    const kiosk = await this.kiosks.findOne({ where: { id: order.kiosk_id } });
    let job: Job | null = null;
    if (order.job_id) {
      job = await this.jobs.findOne({ where: { id: order.job_id } });
    }

    return {
      ...order,
      kiosk: kiosk
        ? {
            name: kiosk.name,
            address: kiosk.address,
            image_url: kiosk.image_url,
            lat: kiosk.lat,
            lng: kiosk.lng,
          }
        : null,
      job: job
        ? {
            id: job.id,
            status: job.status,
            courier_step: job.courier_step,
            selected_courier_id: job.selected_courier_id,
            pickup_lat: job.pickup_lat,
            pickup_lng: job.pickup_lng,
            dropoff_lat: job.dropoff_lat,
            dropoff_lng: job.dropoff_lng,
          }
        : null,
    };
  }

  private async getOwnedOrder(id: string, userId: string, roles: AppRole[]) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    const isAdmin = roles.includes("admin") || roles.includes("manager");
    if (order.user_id !== userId && !isAdmin) {
      throw new ForbiddenException("Not allowed");
    }
    return order;
  }

  async cancelOwn(id: string, userId: string, roles: AppRole[]) {
    const order = await this.getOwnedOrder(id, userId, roles);
    if (order.status !== "pending") {
      throw new BadRequestException(`Cannot cancel in status ${order.status}`);
    }
    order.status = "cancelled";
    order.cancelled_at = new Date();
    await this.orders.save(order);
    return { ok: true as const };
  }

  async confirm(id: string) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "pending") {
      throw new BadRequestException(`Invalid status: ${order.status}`);
    }
    order.status = "preparing";
    order.confirmed_at = new Date();
    await this.orders.save(order);
    return { ok: true as const };
  }

  async reject(id: string, reason?: string | null) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    if (!["pending", "preparing"].includes(order.status)) {
      throw new BadRequestException(`Cannot reject in status ${order.status}`);
    }
    order.status = "rejected";
    order.rejection_reason = reason ?? null;
    order.cancelled_at = new Date();
    await this.orders.save(order);
    return { ok: true as const };
  }

  async markReady(id: string) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    if (!["pending", "preparing"].includes(order.status)) {
      throw new BadRequestException(`Cannot mark ready in status ${order.status}`);
    }

    let jobId = order.job_id;
    if (!jobId) {
      const kiosk = await this.kiosks.findOne({ where: { id: order.kiosk_id } });
      if (!kiosk) throw new NotFoundException("Kiosk not found");

      const payout = Number(order.delivery_fee ?? 15);
      const job = await this.jobs.save(
        this.jobs.create({
          job_number: generateJobNumber(),
          recipient_tracking_token: generateTrackingToken(),
          job_type: "delivery",
          pricing_type: "fixed_price",
          status: "נשלחה לשליחים",
          pickup_address: kiosk.address,
          pickup_lat: kiosk.lat != null ? Number(kiosk.lat) : null,
          pickup_lng: kiosk.lng != null ? Number(kiosk.lng) : null,
          dropoff_address: order.dropoff_address,
          dropoff_lat: order.dropoff_lat != null ? Number(order.dropoff_lat) : null,
          dropoff_lng: order.dropoff_lng != null ? Number(order.dropoff_lng) : null,
          recipient_name: order.guest_name ?? "לקוח מאנצ׳",
          recipient_phone: order.guest_phone,
          guest_name: order.guest_name,
          guest_phone: order.guest_phone,
          description: `הזמנת מאנצ׳ מ${kiosk.name}`,
          payment: String(payout),
          customer_price: order.total,
          suggested_courier_payment: String(payout),
        }),
      );
      jobId = job.id;
    }

    order.status = "ready";
    order.ready_at = new Date();
    order.job_id = jobId;
    await this.orders.save(order);

    return { ok: true as const, job_id: jobId };
  }
}
