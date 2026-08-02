import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { Conversation } from "./entities/conversation.entity";
import { BusinessPushSubscription } from "./entities/business-push-subscription.entity";
import { CourierPushSubscription } from "./entities/courier-push-subscription.entity";
import { WebPushService } from "./web-push.service";

export type ChatPushPayload = {
  kind?: string;
  conversation_id?: string;
  sender_role?: "courier" | "business" | "admin";
  body_preview?: string;
};

/**
 * Internal webhook called by the DB trigger on every new row inserted into
 * `messages`. Sends a Web Push to the other side of a per-job chat.
 * Ported from goi-bot-frontend/src/routes/api/public/hooks.chat-push.ts.
 */
@Injectable()
export class ChatPushService {
  private readonly logger = new Logger(ChatPushService.name);

  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(CourierPushSubscription)
    private readonly courierSubs: Repository<CourierPushSubscription>,
    @InjectRepository(BusinessPushSubscription)
    private readonly businessSubs: Repository<BusinessPushSubscription>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly webPush: WebPushService,
  ) {}

  async handle(payload: ChatPushPayload): Promise<{ ok: boolean }> {
    if (payload?.kind !== "conversation_message" || !payload.conversation_id || !payload.sender_role) {
      return { ok: false };
    }

    const conv = await this.conversations.findOne({ where: { id: payload.conversation_id } });
    if (!conv) return { ok: true };

    // Only per-job chat gets push. Support chats are handled elsewhere.
    if (conv.kind !== "courier_business") return { ok: true };

    const bodyPreview = (payload.body_preview ?? "").trim() || "הודעה חדשה";

    const [courier, business] = await Promise.all([
      conv.courier_id ? this.couriers.findOne({ where: { id: conv.courier_id }, select: ["full_name"] }) : null,
      conv.business_id ? this.customers.findOne({ where: { id: conv.business_id }, select: ["name"] }) : null,
    ]);

    const senderName =
      payload.sender_role === "courier"
        ? (courier?.full_name ?? "השליח")
        : payload.sender_role === "business"
          ? (business?.name ?? "בית העסק")
          : "תמיכה";

    const notifyBusiness = payload.sender_role !== "business" && !!conv.business_id;
    const notifyCourier = payload.sender_role !== "courier" && !!conv.courier_id;

    const jobs: Promise<unknown>[] = [];

    if (notifyBusiness && conv.business_id) {
      jobs.push(this.notifyBusiness(conv.business_id, conv.id, senderName, bodyPreview));
    }
    if (notifyCourier && conv.courier_id) {
      jobs.push(this.notifyCourier(conv.courier_id, conv.id, senderName, bodyPreview));
    }

    await Promise.allSettled(jobs);
    return { ok: true };
  }

  private async notifyBusiness(businessId: string, convId: string, senderName: string, body: string) {
    const subs = await this.businessSubs.find({ where: { business_id: businessId } });
    if (!subs.length) return;
    const results = await this.webPush.sendPushBatch(subs, {
      title: `הודעה מ${senderName}`,
      body,
      url: `/business/messages?conv=${convId}`,
      tag: `chat-${convId}`,
    });
    const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (gone.length) await this.businessSubs.delete({ endpoint: In(gone) });
  }

  private async notifyCourier(courierId: string, convId: string, senderName: string, body: string) {
    const subs = await this.courierSubs.find({ where: { courier_id: courierId } });
    if (!subs.length) return;
    const results = await this.webPush.sendPushBatch(subs, {
      title: `הודעה מ${senderName}`,
      body,
      url: `/courier/messages?c=${convId}`,
      tag: `chat-${convId}`,
    });
    const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (gone.length) await this.courierSubs.delete({ endpoint: In(gone) });
  }
}
