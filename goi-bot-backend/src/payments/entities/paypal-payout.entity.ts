import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "paypal_payouts" })
export class PaypalPayout {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  courier_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  withdrawal_request_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_batch_id!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  paypal_payout_item_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  recipient_email!: string;

  @Column({ type: "numeric" })
  amount_ils!: string;

  @Column({ type: "varchar", length: 16, default: "ILS" })
  currency!: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "text", nullable: true })
  error_message!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128 })
  sender_batch_id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
