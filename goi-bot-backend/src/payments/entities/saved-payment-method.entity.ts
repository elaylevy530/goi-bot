import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** Tranzila card token for a business. The token never leaves the server. */
@Entity({ name: "saved_payment_methods" })
export class SavedPaymentMethod {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "varchar", length: 128 })
  token!: string;

  @Column({ type: "varchar", length: 4 })
  last4!: string;

  @Column({ type: "varchar", length: 2 })
  exp_month!: string;

  @Column({ type: "varchar", length: 4 })
  exp_year!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  brand!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
