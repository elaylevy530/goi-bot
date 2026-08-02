import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "kiosks" })
export class Kiosk {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  address!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  city!: string | null;

  @Column({ type: "numeric", nullable: true })
  lat!: string | null;

  @Column({ type: "numeric", nullable: true })
  lng!: string | null;

  @Column({ type: "text", nullable: true })
  image_url!: string | null;

  @Column({ type: "numeric", nullable: true })
  rating!: string | null;

  @Column({ type: "int", nullable: true })
  rating_count!: number | null;

  @Column({ type: "boolean", default: true })
  is_open!: boolean;

  @Column({ type: "text", nullable: true })
  hours!: string | null;

  @Column({ type: "numeric", default: 15 })
  delivery_fee_default!: string;

  @Column({ type: "numeric", default: 3 })
  service_fee_default!: string;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
