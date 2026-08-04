import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { Job } from "../jobs/entities/job.entity";
import type { UpsertPartnerDto } from "./dto/upsert-partner.dto";
import { Partner } from "./entities/partner.entity";

export type PartnerPublic = Pick<
  Partner,
  "id" | "slug" | "name" | "logo_url" | "contact_phone"
>;

export type PartnerAdminRow = Pick<
  Partner,
  | "id"
  | "slug"
  | "name"
  | "logo_url"
  | "contact_phone"
  | "whatsapp_group_id"
  | "dispatch_note"
  | "is_active"
  | "message_sections"
  | "message_cta"
  | "created_at"
  | "updated_at"
>;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partners: Repository<Partner>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

  async list(): Promise<PartnerAdminRow[]> {
    return this.partners.find({
      order: { created_at: "ASC" },
      select: [
        "id",
        "slug",
        "name",
        "logo_url",
        "contact_phone",
        "whatsapp_group_id",
        "dispatch_note",
        "is_active",
        "message_sections",
        "message_cta",
        "created_at",
        "updated_at",
      ],
    });
  }

  async upsert(dto: UpsertPartnerDto): Promise<{ ok: true; id: string }> {
    const id = dto.id ?? undefined;
    const slug = dto.slug.trim().toLowerCase();
    const name = dto.name.trim();

    const duplicate = await this.partners.findOne({
      where: id ? { slug, id: Not(id) } : { slug },
      select: ["id"],
    });
    if (duplicate) {
      throw new ConflictException("Partner slug already exists");
    }

    const fields = {
      slug,
      name,
      logo_url: emptyToNull(dto.logo_url),
      contact_phone: emptyToNull(dto.contact_phone),
      whatsapp_group_id: emptyToNull(dto.whatsapp_group_id),
      dispatch_note: emptyToNull(dto.dispatch_note),
      is_active: dto.is_active,
      message_sections: dto.message_sections ?? {},
      message_cta: emptyToNull(dto.message_cta),
    };

    if (id) {
      const row = await this.partners.findOne({ where: { id } });
      if (!row) throw new NotFoundException("Partner not found");
      Object.assign(row, fields);
      await this.partners.save(row);
      return { ok: true as const, id: row.id };
    }

    const created = await this.partners.save(this.partners.create(fields));
    return { ok: true as const, id: created.id };
  }

  async remove(id: string): Promise<{ ok: true }> {
    const result = await this.partners.delete(id);
    if (!result.affected) throw new NotFoundException("Partner not found");
    return { ok: true as const };
  }

  /** Active partner only — limited public fields. */
  async getPublicBySlug(slug: string): Promise<PartnerPublic> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) throw new NotFoundException("Partner not found");

    const row = await this.partners.findOne({
      where: { slug: normalized, is_active: true },
      select: ["id", "slug", "name", "logo_url", "contact_phone"],
    });
    if (!row) throw new NotFoundException("Partner not found");
    return row;
  }

  /** Full active partner row for dispatch / guest attribution (internal). */
  async findActiveBySlug(slug: string): Promise<Partner | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    return this.partners.findOne({
      where: { slug: normalized, is_active: true },
    });
  }

  async findById(id: string): Promise<Partner | null> {
    return this.partners.findOne({ where: { id } });
  }

  /** Latest job for WhatsApp message preview in admin partners UI. */
  async getLastJobForPreview(partnerId?: string | null) {
    const qb = this.jobs
      .createQueryBuilder("j")
      .select([
        "j.id",
        "j.job_number",
        "j.short_code",
        "j.service_category",
        "j.number_of_packages",
        "j.fragile",
        "j.description",
        "j.pickup_address",
        "j.pickup_area",
        "j.pickup_notes",
        "j.dropoff_address",
        "j.dropoff_area",
        "j.dropoff_notes",
        "j.recipient_name",
        "j.recipient_phone",
        "j.estimated_distance_km",
        "j.vehicle_required",
        "j.job_date",
        "j.job_time",
        "j.suggested_courier_payment",
        "j.payment",
        "j.pricing_type",
      ])
      .orderBy("j.created_at", "DESC")
      .take(1);
    if (partnerId) qb.andWhere("j.partner_id = :partnerId", { partnerId });
    const row = await qb.getOne();
    if (!row) return null;
    return {
      id: row.id,
      job_number: row.job_number,
      short_code: row.short_code,
      service_category: row.service_category,
      number_of_packages: row.number_of_packages,
      fragile: row.fragile,
      description: row.description,
      pickup_address: row.pickup_address,
      pickup_area: row.pickup_area,
      pickup_notes: row.pickup_notes,
      dropoff_address: row.dropoff_address,
      dropoff_area: row.dropoff_area,
      dropoff_notes: row.dropoff_notes,
      recipient_name: row.recipient_name,
      recipient_phone: row.recipient_phone,
      estimated_distance_km:
        row.estimated_distance_km != null
          ? Number(row.estimated_distance_km)
          : null,
      vehicle_required: row.vehicle_required,
      job_date: row.job_date,
      job_time: row.job_time,
      suggested_courier_payment:
        row.suggested_courier_payment != null
          ? Number(row.suggested_courier_payment)
          : null,
      payment: row.payment != null ? Number(row.payment) : null,
      pricing_type: row.pricing_type,
    };
  }
}
