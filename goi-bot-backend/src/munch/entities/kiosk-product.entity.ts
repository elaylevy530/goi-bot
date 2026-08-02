import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "kiosk_products" })
export class KioskProduct {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  kiosk_id!: string;

  @Column({ type: "uuid", nullable: true })
  category_id!: string | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "numeric" })
  price!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  unit!: string | null;

  @Column({ type: "text", nullable: true })
  image_url!: string | null;

  @Column({ type: "boolean", default: true })
  is_available!: boolean;

  @Column({ type: "int", default: 0 })
  sort_order!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
