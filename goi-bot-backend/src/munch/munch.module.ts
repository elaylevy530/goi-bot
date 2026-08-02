import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Job } from "../jobs/entities/job.entity";
import { Kiosk } from "./entities/kiosk.entity";
import { KioskCategory } from "./entities/kiosk-category.entity";
import { KioskProduct } from "./entities/kiosk-product.entity";
import { MunchOrder } from "./entities/munch-order.entity";
import { MunchController } from "./munch.controller";
import { MunchService } from "./munch.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Kiosk, KioskCategory, KioskProduct, MunchOrder, Job]),
  ],
  controllers: [MunchController],
  providers: [MunchService],
})
export class MunchModule {}
