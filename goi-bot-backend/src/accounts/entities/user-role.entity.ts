import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "user_roles" })
@Index(["user_id", "role"], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "varchar", length: 32 })
  role!: "admin" | "manager" | "courier" | "business";

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
