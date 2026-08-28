import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export const COURIER_DOCUMENT_TYPES = [
  "driver_license",
  "vehicle_license",
  "insurance",
  "comprehensive_insurance",
] as const;

export type CourierDocumentType = (typeof COURIER_DOCUMENT_TYPES)[number];

@Entity({ name: "courier_documents" })
@Unique(["courier_id", "type"])
export class CourierDocument {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  courier_id!: string;

  @Column({ type: "varchar", length: 64 })
  type!: CourierDocumentType;

  @Column({ type: "varchar", length: 512, nullable: true })
  file_url!: string | null;

  @Column({ type: "date", nullable: true })
  expires_at!: string | Date | null;

  @Column({ type: "boolean", default: false })
  verified!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
