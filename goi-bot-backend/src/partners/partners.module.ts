import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Job } from "../jobs/entities/job.entity";
import { Partner } from "./entities/partner.entity";
import {
  PartnersController,
  PublicPartnersController,
} from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  imports: [TypeOrmModule.forFeature([Partner, Job])],
  controllers: [PartnersController, PublicPartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
