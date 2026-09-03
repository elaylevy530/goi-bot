import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JobsModule } from "../jobs/jobs.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { NotificationQueueItem } from "./entities/notification-queue-item.entity";
import { CronSecretGuard } from "./guards/cron-secret.guard";
import { NotificationQueueWorkerController } from "./notification-queue-worker.controller";
import { NotificationQueueWorkerService } from "./notification-queue-worker.service";
import { ScheduledGoOnlineWorkerController } from "./scheduled-go-online-worker.controller";

/**
 * Phase 2 workers surface: `/api/public/notification-queue-worker` drains the
 * queue with real TypeORM + Green API send logic (parity with
 * goi-bot-frontend/src/lib/whatsapp/notification-queue.server.ts).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationQueueItem]),
    WhatsappModule,
    JobsModule,
  ],
  controllers: [NotificationQueueWorkerController, ScheduledGoOnlineWorkerController],
  providers: [NotificationQueueWorkerService, CronSecretGuard],
})
export class WorkersModule {}
