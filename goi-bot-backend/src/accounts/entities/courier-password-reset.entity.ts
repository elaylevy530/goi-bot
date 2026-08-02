import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "courier_password_resets" })
export class CourierPasswordReset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  phone!: string;

  @Column({ type: "varchar", length: 128 })
  code_hash!: string;

  @Column({ type: "timestamptz" })
  expires_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  consumed_at!: Date | null;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
