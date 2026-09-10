import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PricingRule } from "./entities/pricing-rule.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [TypeOrmModule.forFeature([PricingRule, Customer])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
