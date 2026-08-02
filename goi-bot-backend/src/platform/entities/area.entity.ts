import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "areas" })
export class Area {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 255, unique: true }) name!: string;
  @Column({ type: "boolean", default: true }) is_active!: boolean;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
