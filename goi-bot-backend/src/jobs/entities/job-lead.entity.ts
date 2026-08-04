import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "job_leads" })
export class JobLead {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  /** take = accepted fixed price; quote = mover submitted an offer */
  @Column({ type: "varchar", length: 16 })
  kind!: "take" | "quote";

  @Column({ type: "varchar", length: 80 })
  full_name!: string;

  @Column({ type: "varchar", length: 32 })
  phone!: string;

  @Column({ type: "numeric", nullable: true })
  price!: string | null;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "varchar", length: 60, nullable: true })
  partner_slug!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
