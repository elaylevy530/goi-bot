import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "./guards/cron-secret.guard";
import { NotificationQueueWorkerService } from "./notification-queue-worker.service";

/**
 * Same path as TanStack: `/api/public/notification-queue-worker`.
 * Real drain logic (TypeORM + Green API) — see NotificationQueueWorkerService.
 */
@Controller("api/public/notification-queue-worker")
@UseGuards(CronSecretGuard)
export class NotificationQueueWorkerController {
  constructor(private readonly worker: NotificationQueueWorkerService) {}

  @Get()
  drainGet() {
    return this.worker.drain();
  }

  @Post()
  drainPost() {
    return this.worker.drain();
  }
}
