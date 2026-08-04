import { Body, Controller, Get, Header, Param, Post } from "@nestjs/common";
import { SubmitJobLeadDto } from "./dto/submit-job-lead.dto";
import { PublicJobsService } from "./public-jobs.service";

/**
 * Unauthenticated mover board (WhatsApp group links).
 * Accepts job uuid OR short_code — separate from token-gated guest APIs.
 */
@Controller("api/public/mover-jobs")
export class PublicMoverJobsController {
  constructor(private readonly publicJobs: PublicJobsService) {}

  @Get(":ref")
  @Header("Cache-Control", "no-store")
  getPublic(@Param("ref") ref: string) {
    return this.publicJobs.getPublicJob(ref);
  }

  @Post(":ref/leads")
  @Header("Cache-Control", "no-store")
  submitLead(@Param("ref") ref: string, @Body() dto: SubmitJobLeadDto) {
    return this.publicJobs.submitLead(ref, dto);
  }
}
