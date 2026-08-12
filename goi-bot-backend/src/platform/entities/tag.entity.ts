import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "tags" })
export class Tag {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 128, unique: true }) name!: string;
  @Column({ type: "varchar", length: 32, nullable: true }) color!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
