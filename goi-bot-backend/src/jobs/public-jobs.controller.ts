import {
  Body,
  Controller,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateGuestJobDto } from "./dto/create-guest-job.dto";
import {
  GuestChatListDto,
  GuestChatMarkReadDto,
  GuestChatOpenDto,
  GuestChatPostMessageDto,
} from "./dto/guest-chat.dto";
import {
  GuestCancelJobDto,
  GuestJobRefDto,
  GuestSelectQuoteDto,
} from "./dto/guest-job-ref.dto";
import { GuestJobsListDto } from "./dto/guest-jobs-list.dto";
import {
  GuestPaypalCaptureDto,
  GuestPaypalOrderDto,
} from "./dto/guest-paypal.dto";
import { GuestRepriceJobDto } from "./dto/reprice-job.dto";
import { PublicJobsService } from "./public-jobs.service";

/**
 * Public (token-gated) guest order surface matching
 * goi-bot-frontend/src/lib/guest-order.functions.ts.
 */
@Controller("api/public/jobs")
export class PublicJobsController {
  constructor(private readonly publicJobs: PublicJobsService) {}

  @Post()
  @Header("Cache-Control", "no-store")
  create(@Body() dto: CreateGuestJobDto) {
    return this.publicJobs.create(dto);
  }

  @Post("list")
  @Header("Cache-Control", "no-store")
  list(@Body() dto: GuestJobsListDto) {
    return this.publicJobs.list(dto.refs);
  }

  @Post(":job_id/confirm")
  @Header("Cache-Control", "no-store")
  confirm(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestJobRefDto,
  ) {
    return this.publicJobs.confirm({ ...body, job_id: jobId });
  }

  @Post(":job_id/status")
  @Header("Cache-Control", "no-store")
  status(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestJobRefDto,
  ) {
    return this.publicJobs.status({ ...body, job_id: jobId });
  }

  @Post(":job_id/quotes")
  @Header("Cache-Control", "no-store")
  quotes(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestJobRefDto,
  ) {
    return this.publicJobs.listQuotes({ ...body, job_id: jobId });
  }

  @Post(":job_id/quotes/:quote_id/select")
  @Header("Cache-Control", "no-store")
  selectQuote(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Param("quote_id", ParseUUIDPipe) quoteId: string,
    @Body() body: GuestSelectQuoteDto,
  ) {
    return this.publicJobs.selectQuote(jobId, quoteId, {
      ...body,
      job_id: jobId,
      quote_id: quoteId,
    });
  }

  @Post(":job_id/paypal-order")
  @Header("Cache-Control", "no-store")
  paypalOrder(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestPaypalOrderDto,
  ) {
    return this.publicJobs.paypalOrder({ ...body, job_id: jobId });
  }

  @Post(":job_id/paypal-capture")
  @Header("Cache-Control", "no-store")
  paypalCapture(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestPaypalCaptureDto,
  ) {
    return this.publicJobs.paypalCapture({ ...body, job_id: jobId });
  }

  @Post(":job_id")
  @Header("Cache-Control", "no-store")
  detail(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestJobRefDto,
  ) {
    return this.publicJobs.detail({ ...body, job_id: jobId });
  }

  @Patch(":job_id")
  @Header("Cache-Control", "no-store")
  cancel(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestCancelJobDto,
  ) {
    return this.publicJobs.cancel({ ...body, job_id: jobId });
  }

  @Post(":job_id/reprice")
  @Header("Cache-Control", "no-store")
  reprice(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestRepriceJobDto,
  ) {
    return this.publicJobs.repriceGuest(jobId, body);
  }

  @Post(":job_id/chat/open")
  @Header("Cache-Control", "no-store")
  openChat(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestChatOpenDto,
  ) {
    return this.publicJobs.openGuestChat(jobId, { ...body, job_id: jobId });
  }

  @Post(":job_id/chat/messages/list")
  @Header("Cache-Control", "no-store")
  listChatMessages(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestChatListDto,
  ) {
    return this.publicJobs.listGuestChatMessages(jobId, {
      ...body,
      job_id: jobId,
    });
  }

  @Post(":job_id/chat/messages")
  @Header("Cache-Control", "no-store")
  postChatMessage(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestChatPostMessageDto,
  ) {
    return this.publicJobs.postGuestChatMessage(jobId, {
      ...body,
      job_id: jobId,
    });
  }

  @Post(":job_id/chat/mark-read")
  @Header("Cache-Control", "no-store")
  markChatRead(
    @Param("job_id", ParseUUIDPipe) jobId: string,
    @Body() body: GuestChatMarkReadDto,
  ) {
    return this.publicJobs.markGuestChatRead(jobId, {
      ...body,
      job_id: jobId,
    });
  }
}
