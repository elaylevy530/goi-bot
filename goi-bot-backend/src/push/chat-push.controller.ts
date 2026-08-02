import { Body, Controller, HttpCode, Logger, Post, UseGuards } from "@nestjs/common";
import { ChatPushGuard } from "./chat-push.guard";
import { ChatPushPayload, ChatPushService } from "./chat-push.service";

/**
 * Same path as TanStack (`createFileRoute("/api/public/hooks/chat-push")`):
 * `/api/public/hooks/chat-push`.
 */
@Controller("api/public/hooks/chat-push")
@UseGuards(ChatPushGuard)
export class ChatPushController {
  private readonly logger = new Logger(ChatPushController.name);

  constructor(private readonly service: ChatPushService) {}

  @Post()
  @HttpCode(200)
  async receive(@Body() payload: ChatPushPayload) {
    try {
      return await this.service.handle(payload);
    } catch (e) {
      // Never fail the DB trigger that calls this webhook.
      this.logger.error("chat-push failed", e instanceof Error ? e.stack : e);
      return { ok: true };
    }
  }
}
