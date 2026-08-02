import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUserContext } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PushSubscriptionsService } from "./push-subscriptions.service";

type SubBody = {
  courierId?: string;
  id?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

@Controller("api/push")
@UseGuards(JwtAuthGuard)
export class PushSubscriptionsController {
  constructor(private readonly pushSubs: PushSubscriptionsService) {}

  @Post("courier-subscriptions")
  upsertCourier(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: SubBody,
    @Headers("user-agent") userAgent?: string,
  ) {
    const courierId = body.courierId ?? body.id;
    if (!courierId) throw new BadRequestException("courierId required");
    return this.pushSubs.upsertCourier(
      auth.userId,
      auth.roles,
      courierId,
      body.subscription ?? {},
      userAgent ?? null,
    );
  }

  @Delete("courier-subscriptions/:courierId")
  deleteCourier(
    @CurrentUser() auth: AuthUserContext,
    @Param("courierId", ParseUUIDPipe) courierId: string,
  ) {
    return this.pushSubs.deleteCourier(auth.userId, auth.roles, courierId);
  }

  @Post("business-subscriptions")
  upsertBusiness(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: SubBody,
    @Headers("user-agent") userAgent?: string,
  ) {
    const businessId = body.id;
    if (!businessId) throw new BadRequestException("id required");
    return this.pushSubs.upsertBusiness(
      auth.userId,
      auth.roles,
      businessId,
      body.subscription ?? {},
      userAgent ?? null,
    );
  }

  @Post("customer-subscriptions")
  upsertCustomer(
    @CurrentUser() auth: AuthUserContext,
    @Body() body: SubBody,
    @Headers("user-agent") userAgent?: string,
  ) {
    const targetUserId = body.id;
    if (!targetUserId) throw new BadRequestException("id required");
    return this.pushSubs.upsertCustomer(
      auth.userId,
      auth.roles,
      targetUserId,
      body.subscription ?? {},
      userAgent ?? null,
    );
  }
}
