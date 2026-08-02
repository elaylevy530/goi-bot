import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "../jobs/entities/job.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import type { CapturePerJobDto } from "./dto/capture-per-job.dto";
import type { UpdateBillingRecordDto } from "./dto/update-billing-record.dto";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(BillingRecord)
    private readonly billing: Repository<BillingRecord>,
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

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
