import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { CreatePartnerContactLeadDto } from "./dto/create-partner-contact-lead.dto";
import { PartnerContactLead } from "./entities/partner-contact-lead.entity";

@Injectable()
export class PartnerContactLeadsService {
  constructor(
    @InjectRepository(PartnerContactLead)
    private readonly leads: Repository<PartnerContactLead>,
  ) {}

  async create(
    dto: CreatePartnerContactLeadDto,
  ): Promise<{ ok: true; id: string }> {
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    const messageRaw = dto.message?.trim() ?? "";
    const message = messageRaw.length ? messageRaw.slice(0, 1000) : null;

    if (!name || !phone) {
      throw new BadRequestException("name and phone are required");
    }

    // Persist only: admin WhatsApp notify lives in JobsModule (GreenApiClient)
    // and WhatsappModule already imports PartnersModule — wiring notify here
    // would create a circular module dependency.
    const lead = await this.leads.save(
      this.leads.create({
        name,
        phone,
        message,
        source: "goi-partners",
      }),
    );

    return { ok: true as const, id: lead.id };
  }
}
