import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "wallet_transactions" })
export class WalletTransaction {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "numeric" }) amount!: string;
  @Column({ type: "varchar", length: 64, default: "recharge" }) kind!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "jsonb", default: {} }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}