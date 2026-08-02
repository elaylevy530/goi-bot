import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "pricing_rules" })
export class PricingRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "numeric", default: 0 })
  base_price!: string;

  @Column({ type: "numeric", default: 0 })
  price_per_km!: string;

  @Column({ type: "numeric", default: 0 })
  minimum_price!: string;

  @Column({ type: "numeric", default: 0 })
  extra_stop_fee!: string;

  @Column({ type: "numeric", default: 0 })
  heavy_package_surcharge!: string;

  @Column({ type: "numeric", default: 0 })
  waiting_fee_per_minute!: string;

  @Column({ type: "numeric", default: 0 })
  night_surcharge_percent!: string;

  @Column({ type: "numeric", default: 0 })
  weekend_surcharge_percent!: string;

  @Column({ type: "numeric", default: 0 })
  platform_fee_fixed!: string;

  @Column({ type: "numeric", default: 0 })
  platform_fee_percent!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
