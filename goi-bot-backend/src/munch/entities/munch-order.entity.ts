import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "munch_orders" })
export class MunchOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  user_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  guest_phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  guest_name!: string | null;

  @Column({ type: "uuid" })
  kiosk_id!: string;

  @Column({ type: "jsonb", default: [] })
  items!: unknown;

  @Column({ type: "numeric", default: 0 })
  subtotal!: string;

  @Column({ type: "numeric", default: 0 })
  delivery_fee!: string;

  @Column({ type: "numeric", default: 0 })
  service_fee!: string;

  @Column({ type: "numeric", default: 0 })
  total!: string;

  @Column({ type: "text" })
  dropoff_address!: string;

  @Column({ type: "numeric", nullable: true })
  dropoff_lat!: string | null;

  @Column({ type: "numeric", nullable: true })
  dropoff_lng!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "uuid", nullable: true })
  job_id!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  confirmed_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  ready_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  picked_up_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  delivered_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  cancelled_at!: Date | null;

  @Column({ type: "text", nullable: true })
  rejection_reason!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
