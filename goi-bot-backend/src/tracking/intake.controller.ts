import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Options,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { IntakeService } from "./intake.service";

/**
 * Public intake endpoint for restaurant/business websites. Same path as
 * TanStack: `/api/public/intake/:token`. Ported from intake.$token.ts.
 *
 * Intentionally public CORS (any origin may POST orders here) — security is
 * the per-business `integration_token` + optional HMAC `x-signature`.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-signature",
};

@Controller("api/public/intake")
export class IntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Options(":token")
  @HttpCode(204)
  options(@Res({ passthrough: true }) res: Response) {
    res.set(CORS_HEADERS);
  }

  @Get(":token")
  async info(@Param("token") token: string, @Res({ passthrough: true }) res: Response) {
    res.set(CORS_HEADERS);
    const meta = await this.intake.meta(token);
    if (!meta) return { ok: false, enabled: false };
    return { ok: true, ...meta };
  }

  @Post(":token")
  async receive(
    @Param("token") token: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-signature") signature: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set(CORS_HEADERS);
    const rawBody = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    const result = await this.intake.handle(token, rawBody, signature);
    res.status(result.status);
    return result.body;
  }
}
