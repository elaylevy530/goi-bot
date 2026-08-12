import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../accounts/entities/customer.entity";
import { previewCustomerId } from "../auth/auth-als";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { WalletTransaction } from "./entities/wallet-transaction.entity";
import type { CapturePerJobDto } from "./dto/capture-per-job.dto";
import type { UpdateBillingRecordDto } from "./dto/update-billing-record.dto";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(BillingRecord)
    private readonly billing: Repository<BillingRecord>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(WalletTransaction)
    private readonly walletTx: Repository<WalletTransaction>,
  ) {}

  private async requireBusinessId(userId: string) {
    const previewId = previewCustomerId();
    const customer = previewId
      ? await this.customers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.customers.findOne({ where: { user_id: userId }, select: ["id"] });
    if (!customer) throw new ForbiddenException("Business profile required");
    return customer.id;
  }

  async listWalletTransactions(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.walletTx.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
      take: 200,
    });
  }

  /**
   * Ledger credit for prepaid wallet. Real card/PayPal capture can be layered later;
   * this records the recharge + bonus so the business UI balance works.
   */
  async rechargeWallet(
    userId: string,
    body: { amount: number; bonusVal?: number; pct?: number },
  ) {
    const businessId = await this.requireBusinessId(userId);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 50) {
      throw new BadRequestException("Minimum recharge is ₪50");
    }
    const bonusVal = Math.max(0, Number(body.bonusVal ?? 0));
    const pct = Math.max(0, Number(body.pct ?? 0));
    const credit = amount + bonusVal;
    return this.walletTx.save(
      this.walletTx.create({
        business_id: businessId,
        amount: String(credit),
        kind: "recharge",
        description:
          bonusVal > 0
            ? `טעינה ₪${amount} + בונוס ${pct}% (₪${bonusVal})`
            : `טעינה ₪${amount}`,
        metadata: { amount, bonusVal, pct },
      }),
    );
  }

  async getBillingRecord(id: string) {
    const rec = await this.billing.findOne({ where: { id } });
    if (!rec) throw new NotFoundException("Billing record not found");

    const job = await this.jobs.findOne({
      where: { id: rec.job_id },
      select: ["job_number"],
    });

    return {
      id: rec.id,
      business_id: rec.business_id,
      customer_price: Number(rec.customer_price),
      status: rec.status,
      paypal_capture_id: rec.paypal_capture_id,
      job_number: job?.job_number ?? null,
    };
  }

  async updateBillingRecord(id: string, dto: UpdateBillingRecordDto) {
    const rec = await this.billing.findOne({ where: { id } });
    if (!rec) throw new NotFoundException("Billing record not found");
    Object.assign(rec, {
      ...dto,
      customer_price: dto.customer_price != null ? String(dto.customer_price) : rec.customer_price,
      courier_payment: dto.courier_payment != null ? String(dto.courier_payment) : rec.courier_payment,
      platform_fee: dto.platform_fee != null ? String(dto.platform_fee) : rec.platform_fee,
    });
    await this.billing.save(rec);
    return rec;
  }

  async capturePerJob(dto: CapturePerJobDto) {
    const job = await this.jobs.findOne({ where: { id: dto.job_id } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.per_job_paid) return { ok: true as const, already: true };
    if (job.paypal_order_id && job.paypal_order_id !== dto.order_id) {
      throw new NotFoundException("Order mismatch");
    }

    const customerPrice = Number(job.customer_price ?? 0);
    const courierPay = Number(job.suggested_courier_payment ?? 0);
    const fee = Math.max(0, customerPrice - courierPay);

    let rec = await this.billing.findOne({ where: { job_id: dto.job_id } });
    if (!rec) {
      rec = this.billing.create({
        job_id: dto.job_id,
        business_id: job.customer_id!,
        customer_price: String(customerPrice),
        courier_payment: String(courierPay),
        platform_fee: String(fee),
        provider: "paypal",
        paypal_order_id: dto.order_id,
        paypal_capture_id: dto.capture_id,
        status: "captured",
        billing_status: "paid",
      });
    } else {
      rec.provider = "paypal";
      rec.paypal_order_id = dto.order_id;
      rec.paypal_capture_id = dto.capture_id;
      rec.status = "captured";
      rec.billing_status = "paid";
      rec.customer_price = String(customerPrice);
      rec.courier_payment = String(courierPay);
      rec.platform_fee = String(fee);
    }
    await this.billing.save(rec);

    job.per_job_paid = true;
    await this.jobs.save(job);

    return { ok: true as const };
  }
}
