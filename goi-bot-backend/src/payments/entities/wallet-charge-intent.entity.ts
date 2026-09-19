import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "wallet_charge_intents" })
export class WalletChargeIntent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "varchar", length: 32 })
  kind!: string;

  @Column({ type: "numeric" })
  amount!: string;

  @Column({ type: "numeric", default: 0 })
  bonus_val!: string;

  @Column({ type: "numeric", default: 0 })
  pct!: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Index({ unique: true, where: '"tranzila_transaction_id" IS NOT NULL' })
  @Column({ type: "varchar", length: 128, nullable: true })
  tranzila_transaction_id!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
