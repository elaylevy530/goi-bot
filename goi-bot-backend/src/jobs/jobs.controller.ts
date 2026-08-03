import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUserContext } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateJobDto } from "./dto/create-job.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { ClaimJobDto, RespondOfferDto } from "./dto/courier-actions.dto";
import { CourierDeclineDto } from "./dto/courier-decline.dto";
import { CancelJobDto } from "./dto/cancel-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsService } from "./jobs.service";

@Controller("api/jobs")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get("by-token/:token")
  byToken(@Param("token") token: string) {
    return this.jobs.getByTrackingToken(token);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() auth: AuthUserContext,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.jobs.listForUser(
      auth.userId,
      auth.roles,
      status,
      limit ? Number(limit) : 100,
    );
  }

  @Get("courier/offers")
  @UseGuards(JwtAuthGuard)
  courierOffers(
    @CurrentUser() auth: AuthUserContext,
    @Query("response") response?: string,
  ) {
    return this.jobs.listCourierOffers(auth.userId, response);
  }

  @Get("courier/declines")
  @UseGuards(JwtAuthGuard)
  courierDeclines(@CurrentUser() auth: AuthUserContext) {
    return this.jobs.listCourierDeclines(auth.userId);
  }

  @Post("courier/declines")
  @UseGuards(JwtAuthGuard)
  addCourierDecline(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: CourierDeclineDto,
  ) {
    return this.jobs.addCourierDecline(auth.userId, dto.job_id);
  }

  @Delete("courier/declines/:jobId")
  @UseGuards(JwtAuthGuard)
  removeCourierDecline(
    @CurrentUser() auth: AuthUserContext,
    @Param("jobId", ParseUUIDPipe) jobId: string,
  ) {
    return this.jobs.removeCourierDecline(auth.userId, jobId);
  }

  @Get("courier/open-broadcast")
  @UseGuards(JwtAuthGuard)
  courierOpenBroadcast(@CurrentUser() auth: AuthUserContext) {
    return this.jobs.listOpenBroadcastJobs(auth.userId);
  }

  @Get("courier/open-quotes")
  @UseGuards(JwtAuthGuard)
  courierOpenQuotes(@CurrentUser() auth: AuthUserContext) {
    return this.jobs.listOpenQuoteJobs(auth.userId);
  }

  @Get("courier/quotes")
  @UseGuards(JwtAuthGuard)
  courierQuotes(
    @CurrentUser() auth: AuthUserContext,
    @Query("job_ids") jobIds?: string,
  ) {
    const ids = (jobIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return this.jobs.listCourierQuotes(auth.userId, ids);
  }

  @Post("courier/respond-offer")
  @UseGuards(JwtAuthGuard)
  respondOffer(
    @CurrentUser() auth: AuthUserContext,
    @Body() dto: RespondOfferDto,
  ) {
    return this.jobs.respondToOffer(auth.userId, dto.offer_id, dto.response);
  }

  @Post("courier/claim")
  @UseGuards(JwtAuthGuard)
  claimJob(@CurrentUser() auth: AuthUserContext, @Body() dto: ClaimJobDto) {
    return this.jobs.claimJob(auth.userId, dto.job_id, dto.source);
  }

  @Get("courier/active-count")
  @UseGuards(JwtAuthGuard)
  courierActiveCount(@CurrentUser() auth: AuthUserContext) {
    return this.jobs.countCourierActiveJobs(auth.userId);
  }

  @Get("courier/active-jobs")
  @UseGuards(JwtAuthGuard)
  courierActiveJobs(@CurrentUser() auth: AuthUserContext) {
    return this.jobs.listCourierActiveJobs(auth.userId);
  }

  @Post("courier/progress")
  @UseGuards(JwtAuthGuard)
  courierProgress(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: { job_id: string; step: string },
  ) {
    return this.jobs.courierUpdateProgress(auth.userId, body.job_id, body.step);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  get(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.jobs.getForUser(id, auth.userId, auth.roles);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() auth: AuthUserContext, @Body() dto: CreateJobDto) {
    return this.jobs.create(auth.userId, auth.roles, dto);
  }

  @Post(":id/dispatch")
  @UseGuards(JwtAuthGuard)
  async dispatch(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    // Ensure caller can update the job before opening it to couriers.
    await this.jobs.getForUser(id, auth.userId, auth.roles);
    return this.jobs.dispatchJob(id);
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  cancel(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelJobDto,
  ) {
    return this.jobs.cancelByStaff(id, auth.userId, auth.roles, dto.reason);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobs.update(id, auth.userId, auth.roles, dto);
  }

  @Get(":id/stops")
  @UseGuards(JwtAuthGuard)
  listStops(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.jobs.listJobStops(id, auth.userId, auth.roles);
  }

  @Patch(":jobId/stops/:stopId")
  @UseGuards(JwtAuthGuard)
  updateStop(
    @CurrentUser() auth: AuthUserContext,
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Param("stopId", ParseUUIDPipe) stopId: string,
    @Body() body: { status: "arrived" | "done" },
  ) {
    return this.jobs.updateJobStop(stopId, auth.userId, auth.roles, body.status);
  }

  @Get(":id/quotes")
  @UseGuards(JwtAuthGuard)
  listQuotes(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.jobs.listQuotes(id, auth.userId, auth.roles);
  }

  @Post(":id/quotes")
  @UseGuards(JwtAuthGuard)
  submitQuote(
    @CurrentUser() auth: AuthUserContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.jobs.submitQuote(id, auth.userId, auth.roles, dto);
  }

  @Post(":jobId/quotes/:quoteId/select")
  @UseGuards(JwtAuthGuard)
  selectQuote(
    @CurrentUser() auth: AuthUserContext,
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Param("quoteId", ParseUUIDPipe) quoteId: string,
  ) {
    return this.jobs.selectQuote(jobId, quoteId, auth.userId, auth.roles);
  }
}
