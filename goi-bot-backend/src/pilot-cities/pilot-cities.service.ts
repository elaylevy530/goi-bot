import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { UpsertPilotCityDto } from "./dto/upsert-pilot-city.dto";
import { PilotCity } from "./entities/pilot-city.entity";

@Injectable()
export class PilotCitiesService {
  constructor(
    @InjectRepository(PilotCity)
    private readonly cities: Repository<PilotCity>,
  ) {}

  list() {
    return this.cities.find({ order: { city_name: "ASC" } });
  }

  async upsert(dto: UpsertPilotCityDto) {
    if (dto.id) {
      const row = await this.cities.findOne({ where: { id: dto.id } });
      if (!row) throw new NotFoundException("Pilot city not found");
      Object.assign(row, {
        city_name: dto.city_name,
        is_active: dto.is_active,
        max_radius_km: dto.max_radius_km != null ? String(dto.max_radius_km) : null,
        notes: dto.notes ?? null,
      });
      await this.cities.save(row);
    } else {
      await this.cities.save(
        this.cities.create({
          city_name: dto.city_name,
          is_active: dto.is_active,
          max_radius_km: dto.max_radius_km != null ? String(dto.max_radius_km) : null,
          notes: dto.notes ?? null,
        }),
      );
    }
    return { ok: true as const };
  }

  async remove(id: string) {
    const result = await this.cities.delete(id);
    if (!result.affected) throw new NotFoundException("Pilot city not found");
    return { ok: true as const };
  }
}
