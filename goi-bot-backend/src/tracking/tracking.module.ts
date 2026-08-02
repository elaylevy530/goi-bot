import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessBranch } from "../accounts/entities/business-branch.entity";
import { BusinessIntegration } from "../accounts/entities/business-integration.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { IntegrationRequestLog } from "../accounts/entities/integration-request-log.entity";
import { Job } from "../jobs/entities/job.entity";
import { JobStop } from "../jobs/entities/job-stop.entity";
import { IntakeController } from "./intake.controller";
import { IntakeService } from "./intake.service";
import { TrackingController } from "./tracking.controller";

/**
 * Public tracking + intake surface:
 * `/api/public/track/:token`, `/api/public/track-stop/:token`,
 * `/api/public/intake/:token`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      JobStop,
      Courier,
      BusinessIntegration,
      BusinessBranch,
      Customer,
      IntegrationRequestLog,
    ]),
  ],
  controllers: [TrackingController, IntakeController],
  providers: [IntakeService],
})
export class TrackingModule {}
