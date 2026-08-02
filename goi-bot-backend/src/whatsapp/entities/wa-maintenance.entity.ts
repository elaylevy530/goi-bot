import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "wa_maintenance" })
export class WaMaintenance {
  @PrimaryColumn({ type: "boolean", default: true }) id!: boolean;
  @Column({ type: "boolean", default: false }) enabled!: boolean;
  @Column({ type: "text", array: true, default: "{}" }) allowlist!: string[];
  @Column({ type: "uuid", nullable: true }) updated_by!: string | null;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
