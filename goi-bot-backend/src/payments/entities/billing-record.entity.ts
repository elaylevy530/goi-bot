import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "billing_records" })
export class BillingRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  job_id!: string;

  @Index()
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "varchar", length: 64, default: "paypal" })
  provider!: string;

  @Column({ type: "varchar", length: 64, default: "pending" })
  status!: string;

  @Column({ type: "varchar", length: 64, default: "pending" })
  billing_status!: string;

  @Column({ type: "numeric", default: 0 })
  customer_price!: string;

  @Column({ type: "numeric", default: 0 })
  courier_payment!: string;

  @Column({ type: "numeric", default: 0 })
  platform_fee!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_order_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_capture_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_payout_batch_id!: string | null;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
