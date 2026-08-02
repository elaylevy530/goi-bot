import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Job } from "../jobs/entities/job.entity";
import { CronSecretGuard } from "../workers/guards/cron-secret.guard";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { BusinessNotification } from "./entities/business-notification.entity";
import { Courier } from "./entities/courier.entity";
import { Customer } from "./entities/customer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Courier, Customer, BusinessNotification, Job]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService, CronSecretGuard],
  exports: [AccountsService],
})
export class AccountsModule {}
