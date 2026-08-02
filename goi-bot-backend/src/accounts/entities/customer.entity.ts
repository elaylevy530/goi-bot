import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "customers" })
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  user_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 64 })
  phone!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 32, default: "business" })
  customer_type!: string;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: string;

  @Column({ type: "varchar", length: 32, default: "standard" })
  account_mode!: string;

  @Column({ type: "varchar", length: 32, default: "monthly" })
  billing_cycle!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  business_name!: string | null;

  @Column({ type: "varchar", length: 64, default: "general" })
  business_niche!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  business_category!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  business_tax_id!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  city!: string | null;

  @Column({ type: "text", array: true, default: "{}" })
  delivery_cities!: string[];

  @Column({ type: "text", array: true, nullable: true })
  service_areas!: string[] | null;

  @Column({ type: "text", nullable: true })
  pickup_address!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  pickup_contact_name!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  pickup_contact_phone!: string | null;

  @Column({ type: "text", nullable: true })
  pickup_instructions!: string | null;

  @Column({ type: "boolean", default: true })
  pickup_watchdog_enabled!: boolean;

  @Column({ type: "int", default: 15 })
  pickup_reminder_minutes!: number;

  @Column({ type: "int", default: 30 })
  pickup_redispatch_minutes!: number;

  @Column({ type: "boolean", default: false })
  favorites_first_enabled!: boolean;

  @Column({ type: "int", default: 10 })
  favorites_fallback_minutes!: number;

  @Column({ type: "boolean", default: false })
  invoice_required!: boolean;

  @Column({ type: "boolean", default: true })
  notify_wa!: boolean;

  @Column({ type: "boolean", default: false })
  notify_email!: boolean;

  @Column({ type: "boolean", default: true })
  notify_recipient_allowed!: boolean;

  @Column({ type: "boolean", default: false })
  notify_recipient_enabled!: boolean;

  @Column({ type: "boolean", default: false })
  payment_method_on_file!: boolean;

  @Column({ type: "varchar", length: 64, nullable: true })
  payment_method_brand!: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  payment_method_last4!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  payment_method_added_at!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  dispatch_blocked_reason!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  signed_agreement_at!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  signed_agreement_name!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  signed_agreement_version!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  payment_provider!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  paypal_email!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_payer_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_vault_id!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  paypal_setup_at!: Date | null;

  @Column({ type: "numeric", nullable: true })
  default_delivery_price!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  default_pricing_type!: string | null;

  @Column({ type: "jsonb", default: {} })
  niche_details!: Record<string, unknown>;

  @Column({ type: "boolean", default: true })
  whatsapp_opt_in!: boolean;

  @Column({ type: "varchar", length: 64, nullable: true })
  whatsapp_provider!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  logo_url!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
