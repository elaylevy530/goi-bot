import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminAssistantThreadsController } from "./admin-assistant-threads.controller";
import { AdminAssistantController } from "./admin-assistant.controller";
import { AdminAssistantService } from "./admin-assistant.service";
import { LovableAiGatewayClient } from "./ai-gateway.client";
import { AdminChatMessage } from "./entities/admin-chat-message.entity";
import { AdminChatThread } from "./entities/admin-chat-thread.entity";

/** Admin surface: `/api/admin-chat` (reply) + `/api/admin-assistant/threads` (CRUD). */
@Module({
  imports: [TypeOrmModule.forFeature([AdminChatThread, AdminChatMessage])],
  controllers: [AdminAssistantController, AdminAssistantThreadsController],
  providers: [AdminAssistantService, LovableAiGatewayClient],
})
export class AdminAssistantModule {}
