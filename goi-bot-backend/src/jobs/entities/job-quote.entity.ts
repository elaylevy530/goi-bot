import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "job_quotes" })
export class JobQuote {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  @Index()
  @Column({ type: "uuid" })
  courier_id!: string;

  @Column({ type: "uuid", nullable: true })
  customer_id!: string | null;

  @Column({ type: "numeric" })
  price!: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "boolean", default: false })
  includes_invoice!: boolean;

  @Column({ type: "boolean", default: false })
  is_final_price!: boolean;

  @Column({ type: "int", nullable: true })
  estimated_arrival_minutes!: number | null;

  @Column({ type: "int", nullable: true })
  estimated_delivery_minutes!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  selected_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
