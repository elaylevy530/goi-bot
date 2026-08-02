import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "business_branches" })
export class BusinessBranch {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  business_id!: string;

  @Column({ type: "varchar", length: 255 })
  branch_name!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  city!: string | null;

  @Column({ type: "text", nullable: true })
  full_address!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_person!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  phone!: string | null;

  @Column({ type: "text", nullable: true })
  courier_notes!: string | null;

  @Column({ type: "text", nullable: true })
  business_hours!: string | null;

  @Column({ type: "boolean", default: false })
  is_default!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
