import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../accounts/entities/customer.entity";
import { TeamMember } from "../accounts/entities/team-member.entity";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { WalletTransaction } from "./entities/wallet-transaction.entity";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { TranzilaPaymentsService } from "./tranzila-payments.service";
import { TranzilaClient } from "./tranzila.client";
import { TranzilaController } from "./tranzila.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingRecord,
      Job,
      Customer,
      TeamMember,
      WalletTransaction,
    ]),
  ],
  controllers: [PaymentsController, TranzilaController],
  providers: [PaymentsService, TranzilaPaymentsService, TranzilaClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
