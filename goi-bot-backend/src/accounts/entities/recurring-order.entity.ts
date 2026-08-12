import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "recurring_orders" })
export class RecurringOrder {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "varchar", length: 64, default: "weekly" }) recurrence_type!: string;
  @Column({ type: "int", array: true, default: "{}" }) days_of_week!: number[];
  @Column({ type: "varchar", length: 16, nullable: true }) start_time!: string | null;
  @Column({ type: "varchar", length: 16, nullable: true }) end_time!: string | null;
  @Column({ type: "text", nullable: true }) pickup_address!: string | null;
  @Column({ type: "text", nullable: true }) dropoff_address!: string | null;
  @Column({ type: "numeric", nullable: true }) payment!: string | null;
  @Column({ type: "int", default: 1 }) couriers_needed!: number;
  @Column({ type: "boolean", default: true }) active!: boolean;
  @Column({ type: "text", nullable: true }) notes!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
