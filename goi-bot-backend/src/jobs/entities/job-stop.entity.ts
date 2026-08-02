import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "job_stops" })
export class JobStop {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  job_id!: string;

  @Column({ type: "int" })
  stop_order!: number;

  @Column({ type: "varchar", length: 32 })
  stop_type!: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status!: string;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  area!: string | null;

  @Column({ type: "double precision", nullable: true })
  lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  lng!: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_name!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  contact_phone!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 128, nullable: true })
  public_token!: string | null;

  @Column({ type: "uuid", nullable: true })
  linked_pickup_id!: string | null;

  @Column({ type: "boolean", nullable: true })
  fragile!: boolean | null;

  @Column({ type: "int", nullable: true })
  number_of_packages!: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  package_size!: string | null;

  @Column({ type: "text", nullable: true })
  package_description!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  proof_photo_url!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  signature_url!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  arrived_at!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  done_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
