import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "job_outcomes" })
export class JobOutcome {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ type: "uuid" }) job_id!: string;
  @Index() @Column({ type: "uuid", nullable: true }) courier_id!: string | null;
  @Column({ type: "timestamptz", nullable: true }) picked_up_at!: Date | null;
  @Column({ type: "timestamptz", nullable: true }) delivered_at!: Date | null;
  @Column({ type: "timestamptz", nullable: true }) expected_delivery_at!: Date | null;
  @Column({ type: "int", nullable: true }) late_minutes!: number | null;
  @Column({ type: "boolean", nullable: true }) was_late!: boolean | null;
  @Column({ type: "boolean", default: false }) was_cancelled!: boolean;
  @Column({ type: "text", nullable: true }) cancellation_reason!: string | null;
  @Column({ type: "int", nullable: true }) customer_rating!: number | null;
  @Column({ type: "text", nullable: true }) customer_comment!: string | null;
  @Column({ type: "numeric", nullable: true }) tip_amount!: string | null;
  @Column({ type: "text", nullable: true }) internal_notes!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
