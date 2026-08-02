import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "withdrawal_requests" })
export class WithdrawalRequest {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) courier_id!: string;
  @Column({ type: "numeric" }) amount!: string;
  @Column({ type: "varchar", length: 32, default: "pending" }) status!: string;
  @Column({ type: "varchar", length: 32, default: "bank" }) payment_method!: string;
  @Column({ type: "varchar", length: 128, nullable: true }) bank_name!: string | null;
  @Column({ type: "varchar", length: 64, nullable: true }) bank_branch!: string | null;
  @Column({ type: "varchar", length: 128, nullable: true }) bank_account!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) account_owner!: string | null;
  @Column({ type: "varchar", length: 64, nullable: true }) bit_phone!: string | null;
  @Column({ type: "text", nullable: true }) note!: string | null;
  @Column({ type: "uuid", nullable: true }) approved_by!: string | null;
  @Column({ type: "timestamptz", nullable: true }) approved_at!: Date | null;
  @Column({ type: "timestamptz", nullable: true }) paid_at!: Date | null;
  @Column({ type: "text", nullable: true }) rejection_reason!: string | null;
  @Column({ type: "varchar", length: 128, nullable: true }) reference_number!: string | null;
  @Column({ type: "text", nullable: true }) receipt_url!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
