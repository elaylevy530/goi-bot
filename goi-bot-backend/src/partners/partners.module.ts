import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Job } from "../jobs/entities/job.entity";
import { PartnerContactLead } from "./entities/partner-contact-lead.entity";
import { Partner } from "./entities/partner.entity";
import { PartnerContactLeadsService } from "./partner-contact-leads.service";
import {
  PartnersController,
  PublicPartnerContactLeadController,
  PublicPartnersController,
} from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  imports: [TypeOrmModule.forFeature([Partner, PartnerContactLead, Job])],
  controllers: [
    PartnersController,
    PublicPartnersController,
    PublicPartnerContactLeadController,
  ],
  providers: [PartnersService, PartnerContactLeadsService],
  exports: [PartnersService],
})
export class PartnersModule {}
