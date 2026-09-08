import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Public VAPID public key for browser PushManager.subscribe. Keys come from env. */
@Controller("api/push")
export class VapidPublicController {
  constructor(private readonly config: ConfigService) {}

  @Get("vapid-public")
  publicKey() {
    return { publicKey: this.config.get<string>("vapid.publicKey") ?? null };
  }
}
