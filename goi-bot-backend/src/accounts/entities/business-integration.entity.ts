import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "business_integrations" })
export class BusinessIntegration {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  business_id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  integration_token!: string;

  @Column({ type: "varchar", length: 128 })
  webhook_secret!: string;

  @Column({ type: "boolean", default: true })
  auto_mode!: boolean;

  @Column({ type: "varchar", length: 32, default: "fixed" })
  default_pricing_type!: string;

  @Column({ type: "numeric", nullable: true })
  default_fixed_price!: string | null;

  @Column({ type: "text", array: true, default: "{}" })
  allowed_origins!: string[];

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
