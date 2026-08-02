import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { PaymentsModule } from "../payments/payments.module";
import { PushModule } from "../push/push.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { JobOutcome } from "./entities/job-outcome.entity";
import { JobStop } from "./entities/job-stop.entity";
import { StatusLog } from "./entities/status-log.entity";
import { CourierJobDecline } from "./entities/courier-job-decline.entity";
import { ExpressPricingRule } from "./entities/express-pricing-rule.entity";
import { Job } from "./entities/job.entity";
import { JobQuote } from "./entities/job-quote.entity";
import { OfferEvent } from "./entities/offer-event.entity";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { PublicJobsController } from "./public-jobs.controller";
import { PublicJobsService } from "./public-jobs.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      JobQuote,
      OfferEvent,
      CourierJobDecline,
      Customer,
      Courier,
      CourierStats,
      ExpressPricingRule,
      JobOutcome,
      JobStop,
      StatusLog,
    ]),
    PaymentsModule,
    WhatsappModule,
    PushModule,
  ],
  controllers: [JobsController, PublicJobsController],
  providers: [JobsService, PublicJobsService],
  exports: [JobsService],
})
export class JobsModule {}
