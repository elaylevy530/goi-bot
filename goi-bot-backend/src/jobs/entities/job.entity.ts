import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "jobs" })
export class Job {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  job_number!: string;

  /** Business-entered order ref. Not unique — the same number can repeat. */
  @Column({ type: "varchar", length: 64, nullable: true })
  order_number!: string | null;

  /** Short public link code for /g/$code (WhatsApp mover leads). */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 16, nullable: true })
  short_code!: string | null;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "varchar", length: 32, default: "delivery" })
  job_type!: string;

  /** Guest/express service: same_day | scheduled | small_move | big_move */
  @Column({ type: "varchar", length: 64, nullable: true })
  service_category!: string | null;

  @Column({ type: "varchar", length: 32, default: "fixed" })
  pricing_type!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  customer_id!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  customer_name!: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  selected_courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  selected_quote_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  created_by!: string | null;

  /** Partner panel attribution (guest deep-link /p/$slug). */
  @Index()
  @Column({ type: "uuid", nullable: true })
  partner_id!: string | null;

  /** Guest / private-customer order fields */
  @Column({ type: "varchar", length: 255, nullable: true })
  guest_name!: string | null;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  guest_phone!: string | null;

  @Column({ type: "text", nullable: true })
  pickup_address!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  pickup_area!: string | null;

  @Column({ type: "double precision", nullable: true })
  pickup_lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  pickup_lng!: number | null;

  @Column({ type: "text", nullable: true })
  pickup_notes!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  pickup_contact_name!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  pickup_contact_phone!: string | null;

  @Column({ type: "text", nullable: true })
  pickup_instructions!: string | null;

  @Column({ type: "uuid", nullable: true })
  pickup_branch_id!: string | null;

  @Column({ type: "int", nullable: true })
  number_of_packages!: number | null;

  @Column({ type: "boolean", default: false })
  pickup_ready!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  pickup_ready_at!: Date | null;

  @Column({ type: "boolean", nullable: true })
  pickup_watchdog_enabled!: boolean | null;

  @Column({ type: "int", default: 0 })
  pickup_redispatch_count!: number;

  @Column({ type: "text", nullable: true })
  dropoff_address!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  dropoff_area!: string | null;

  @Column({ type: "double precision", nullable: true })
  dropoff_lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  dropoff_lng!: number | null;

  @Column({ type: "text", nullable: true })
  dropoff_notes!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  recipient_name!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  recipient_phone!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128, nullable: true })
  recipient_tracking_token!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "numeric", default: 0 })
  payment!: string;

  @Column({ type: "numeric", nullable: true })
  customer_price!: string | null;

  @Column({ type: "numeric", nullable: true })
  platform_fee!: string | null;

  @Column({ type: "numeric", nullable: true })
  suggested_courier_payment!: string | null;

  @Column({ type: "numeric", nullable: true })
  final_price!: string | null;

  @Column({ type: "numeric", nullable: true })
  estimated_distance_km!: string | null;

  @Column({ type: "numeric", nullable: true })
  distance_km!: string | null;

  @Column({ type: "numeric", nullable: true })
  total_distance_km!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  vehicle_required!: string | null;

  @Column({ type: "boolean", default: false })
  is_multi_stop!: boolean;

  @Column({ type: "int", nullable: true })
  stops_count!: number | null;

  @Column({ type: "int", default: 1 })
  couriers_needed!: number;

  @Column({ type: "int", default: 0 })
  matching_couriers_count!: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  matching_model!: string | null;

  @Column({ type: "int", default: 3 })
  max_quotes_to_show!: number;

  @Column({ type: "timestamptz", nullable: true })
  quote_deadline_at!: Date | null;

  @Column({ type: "date", nullable: true })
  job_date!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  job_time!: string | null;

  /** Set when the 30-minute go-online reminder was sent for a scheduled job. */
  @Column({ type: "timestamptz", nullable: true })
  scheduled_online_notified_at!: Date | null;

  @Column({ type: "boolean", default: false })
  fragile!: boolean;

  @Column({ type: "boolean", default: false })
  requires_cash!: boolean;

  @Column({ type: "boolean", default: false })
  requires_refrigeration!: boolean;

  @Column({ type: "boolean", default: false })
  requires_thermal_bag!: boolean;

  @Column({ type: "boolean", default: false })
  invoice_required!: boolean;

  @Column({ type: "boolean", default: false })
  favorites_only_fallback_done!: boolean;

  @Column({ type: "boolean", default: false })
  pilot_area_override!: boolean;

  @Column({ type: "boolean", default: false })
  per_job_paid!: boolean;

  @Column({ type: "numeric", nullable: true })
  per_job_amount!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_order_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  courier_step!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  delivery_status!: string | null;

  @Column({ type: "jsonb", nullable: true })
  pricing_snapshot!: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  accepted_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  picked_up_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  delivered_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
