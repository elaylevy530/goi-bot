import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import type { ReferralCommissionKind } from "../referral-commission";

@Entity({ name: "referral_commissions" })
@Unique(["job_id", "kind"])
export class ReferralCommission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  beneficiary_courier_id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  @Column({ type: "varchar", length: 16 })
  kind!: ReferralCommissionKind;

  @Column({ type: "numeric", default: 0 })
  amount!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  source_courier_id!: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  source_customer_id!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
