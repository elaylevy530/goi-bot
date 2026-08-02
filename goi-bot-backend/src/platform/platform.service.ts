import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlatformSetting } from "./entities/platform-setting.entity";

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settings: Repository<PlatformSetting>,
  ) {}

  get(key: string) {
    return this.settings.findOne({ where: { key } });
  }

  async getMany(keys: string[]) {
    if (!keys.length) return [];
    const rows = await this.settings
      .createQueryBuilder("s")
      .where("s.key IN (:...keys)", { keys })
      .getMany();
    return rows;
  }

  async upsert(key: string, value: unknown, updatedBy: string) {
    await this.settings.save(
      this.settings.create({
        key,
        value,
        updated_by: updatedBy,
      }),
    );
    return { ok: true as const };
  }
}
