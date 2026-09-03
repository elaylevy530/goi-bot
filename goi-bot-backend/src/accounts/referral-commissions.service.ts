import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Courier } from "./entities/courier.entity";
import { Customer } from "./entities/customer.entity";
import { ReferralCommission } from "./entities/referral-commission.entity";
import {
  REFERRAL_COMMISSION_ILS,
  referralCreditsForJob,
} from "./referral-commission";

@Injectable()
export class ReferralCommissionsService {
  private readonly logger = new Logger(ReferralCommissionsService.name);

  constructor(
    @InjectRepository(ReferralCommission)
    private readonly commissions: Repository<ReferralCommission>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}

  async creditForCompletedJob(input: {
    jobId: string;
    selectedCourierId: string | null;
    customerId: string | null;
  }): Promise<void> {
    const worker = input.selectedCourierId
      ? await this.couriers.findOne({
          where: { id: input.selectedCourierId },
          select: ["id", "referred_by_courier_id"],
        })
      : null;
    const business = input.customerId
      ? await this.customers.findOne({
          where: { id: input.customerId },
          select: ["id", "referred_by_courier_id"],
        })
      : null;

    const credits = referralCreditsForJob({
      workerId: worker?.id ?? input.selectedCourierId,
      workerReferredBy: worker?.referred_by_courier_id ?? null,
      businessId: business?.id ?? null,
      businessReferredBy: business?.referred_by_courier_id ?? null,
    });

    for (const credit of credits) {
      try {
        await this.commissions
          .createQueryBuilder()
          .insert()
          .into(ReferralCommission)
          .values({
            beneficiary_courier_id: credit.beneficiaryId,
            job_id: input.jobId,
            kind: credit.kind,
            amount: REFERRAL_COMMISSION_ILS.toFixed(2),
            source_courier_id: credit.sourceCourierId,
            source_customer_id: credit.sourceCustomerId,
          })
          .orIgnore()
          .execute();
      } catch (err) {
        this.logger.error(
          `Failed to credit ${credit.kind} referral on job ${input.jobId}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }
}
