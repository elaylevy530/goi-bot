import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "couriers" })
export class Courier {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  user_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  full_name!: string;

  @Column({ type: "varchar", length: 64 })
  whatsapp_phone!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 32, default: "pending" })
  courier_status!: string;

  @Column({ type: "varchar", length: 32, default: "courier" })
  courier_kind!: string;

  @Column({ type: "boolean", default: true })
  accepting_jobs!: boolean;

  @Column({ type: "boolean", default: false })
  is_paused!: boolean;

  @Column({ type: "boolean", default: false })
  admin_jobs_blocked!: boolean;

  @Column({ type: "numeric", default: 0 })
  balance!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  vehicle_type!: string | null;

  @Column({ type: "text", array: true, default: "{}" })
  vehicle_types!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  working_areas!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  pickup_areas!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  dropoff_areas!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  availability!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  preferred_job_types!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  languages!: string[];

  @Column({ type: "text", array: true, default: "{}" })
  typical_hours!: string[];

  @Column({ type: "varchar", length: 128, nullable: true })
  base_city!: string | null;

  @Column({ type: "double precision", nullable: true })
  last_lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  last_lng!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  last_location_at!: Date | null;

  @Column({ type: "boolean", default: false })
  location_sharing_enabled!: boolean;

  @Column({ type: "int", default: 1 })
  max_concurrent_jobs!: number;

  @Column({ type: "int", default: 0 })
  consecutive_declines!: number;

  @Column({ type: "int", default: 3 })
  auto_pause_after_declines!: number;

  @Column({ type: "boolean", default: true })
  whatsapp_opt_in!: boolean;

  @Column({ type: "boolean", default: false })
  consent_whatsapp!: boolean;

  @Column({ type: "varchar", length: 64, nullable: true })
  whatsapp_provider!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  bank_name!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  bank_account!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  bank_branch!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  bank_account_owner!: string | null;

  @Column({ type: "boolean", default: false })
  bank_details_verified!: boolean;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  avatar_url!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  last_temp_password!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  password_set_at!: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  lead_source!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 16, nullable: true })
  referral_code!: string | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  referred_by_courier_id!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  id_number!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  id_photo_url!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  id_photo_back_url!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  invoice_status!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  vehicle_label!: string | null;

  @Column({ type: "text", nullable: true })
  custom_work_area!: string | null;

  @Column({ type: "text", nullable: true })
  custom_pickup_area!: string | null;

  @Column({ type: "text", nullable: true })
  custom_dropoff_area!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  work_distance_from_base!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  courier_experience_status!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  courier_experience_duration!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  gender!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  paused_at!: Date | null;

  @Column({ type: "text", nullable: true })
  paused_reason!: string | null;

  @Column({ type: "text", array: true, default: "{}" })
  job_types!: string[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
