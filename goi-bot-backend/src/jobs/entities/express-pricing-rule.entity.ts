import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "express_pricing_rules" })
export class ExpressPricingRule {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 128 }) service_category!: string;
  @Column({ type: "varchar", length: 255 }) display_name!: string;
  @Column({ type: "numeric", default: 0 }) base_price!: string;
  @Column({ type: "numeric", default: 0 }) price_per_km!: string;
  @Column({ type: "numeric", default: 0 }) min_price!: string;
  @Column({ type: "varchar", length: 32, default: "full" }) payment_mode!: string;
  @Column({ type: "numeric", default: 0 }) deposit_percent!: string;
  @Column({ type: "boolean", default: true }) allow_customer_fixed_price!: boolean;
  @Column({ type: "boolean", default: true }) allow_customer_quote!: boolean;
  @Column({ type: "text", nullable: true }) notes!: string | null;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
