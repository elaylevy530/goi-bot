import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LovableAiGatewayClient } from "./ai-gateway.client";
import { AdminChatMessage } from "./entities/admin-chat-message.entity";
import { AdminChatThread } from "./entities/admin-chat-thread.entity";

export type UiMessagePart = { type: string; text?: string; [k: string]: unknown };
export type UiMessage = { role: "user" | "assistant" | "system"; parts: UiMessagePart[] };

const SYSTEM_PROMPT = `אתה "ג'וי" - העוזר האישי החכם של המנהל במערכת Goi (משלוחים בישראל).
ענה תמיד בעברית, בטון ידידותי אך מקצועי.
הערה: בשלב זה (Nest phase 2) אין לך עדיין גישה לכלי חיפוש/פעולה במערכת (שליחים, עסקים, משלוחים) —
אם מבקשים ממך נתון חי מהמערכת, הסבר בקצרה שהיכולת הזו עוד לא הועברה מ-TanStack ותציע לבדוק בלוח הבקרה.`;

function textOf(msg: UiMessage): string {
  return msg.parts
    .map((p) => (p.type === "text" ? (p.text ?? "") : ""))
    .join(" ")
    .trim();
}

/**
 * Ported (simplified) from goi-bot-frontend/src/routes/api/admin-chat.ts.
 * SSE streaming + tool-calling (Vercel AI SDK) are not ported — this returns
 * a single non-streaming JSON reply, per Phase 2 scope. Auth is
 * JwtAuthGuard + RolesGuard(admin) protect the controller.
 */
@Injectable()
export class AdminAssistantService {
  constructor(
    @InjectRepository(AdminChatThread) private readonly threads: Repository<AdminChatThread>,
    @InjectRepository(AdminChatMessage) private readonly messages: Repository<AdminChatMessage>,
    private readonly gateway: LovableAiGatewayClient,
  ) {}

  async reply(
    userId: string,
    body: { messages?: UiMessage[]; threadId?: string },
  ): Promise<{ message: UiMessage }> {
    const messages = body.messages;
    const threadId = body.threadId;
    if (!Array.isArray(messages) || !threadId) {
      throw new BadRequestException("Invalid body");
    }

    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }
    if (thread.owner_id !== userId) {
      throw new ForbiddenException("Thread not found");
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      await this.messages.save(
        this.messages.create({
          thread_id: threadId,
          role: "user",
          parts: lastUserMsg.parts,
        }),
      );

      const text = textOf(lastUserMsg);
      const isNewThread = !thread.title || thread.title === "שיחה חדשה" || thread.title === "New chat";
      await this.threads.update(threadId, {
        title: text && isNewThread ? text.slice(0, 60) : thread.title,
        last_message_at: new Date(),
      });
    }

    if (!this.gateway.isConfigured()) {
      throw new BadRequestException("Missing LOVABLE_API_KEY");
    }

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: textOf(m),
      })),
    ];

    const replyText = await this.gateway.chat(chatMessages);
    const assistantMessage: UiMessage = {
      role: "assistant",
      parts: [{ type: "text", text: replyText }],
    };

    await this.messages.save(
      this.messages.create({
        thread_id: threadId,
        role: "assistant",
        parts: assistantMessage.parts,
      }),
    );
    await this.threads.update(threadId, { last_message_at: new Date() });

    return { message: assistantMessage };
  }

  listThreads(userId: string) {
    return this.threads.find({
      where: { owner_id: userId },
      order: { last_message_at: "DESC" },
    });
  }

  async createThread(userId: string) {
    return this.threads.save(
      this.threads.create({
        owner_id: userId,
        title: "שיחה חדשה",
        last_message_at: new Date(),
      }),
    );
  }

  async deleteThread(userId: string, threadId: string) {
    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (thread.owner_id !== userId) throw new ForbiddenException("Thread not found");
    await this.messages.delete({ thread_id: threadId });
    await this.threads.delete({ id: threadId });
    return { ok: true as const };
  }

  async listMessages(userId: string, threadId: string) {
    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (thread.owner_id !== userId) throw new ForbiddenException("Thread not found");
    return this.messages.find({
      where: { thread_id: threadId },
      order: { created_at: "ASC" },
    });
  }
}
