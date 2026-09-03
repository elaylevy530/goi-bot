import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JobsService } from "../jobs/jobs.service";
import { CronSecretGuard } from "./guards/cron-secret.guard";

@Controller("api/public/scheduled-go-online-worker")
@UseGuards(CronSecretGuard)
export class ScheduledGoOnlineWorkerController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  tickGet() {
    return this.jobs.activateCouriersForUpcomingScheduledJobs();
  }

  @Post()
  tickPost() {
    return this.jobs.activateCouriersForUpcomingScheduledJobs();
  }
}
