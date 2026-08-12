import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "saved_contacts" })
export class SavedContact {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ type: "uuid" }) business_id!: string;
  @Column({ type: "varchar", length: 255 }) contact_name!: string;
  @Column({ type: "varchar", length: 64, nullable: true }) phone!: string | null;
  @Column({ type: "varchar", length: 128, nullable: true }) city!: string | null;
  @Column({ type: "text", nullable: true }) full_address!: string | null;
  @Column({ type: "text", nullable: true }) notes!: string | null;
  @Column({ type: "text", array: true, default: "{}" }) tags!: string[];
  @Column({ type: "int", default: 0 }) usage_count!: number;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
