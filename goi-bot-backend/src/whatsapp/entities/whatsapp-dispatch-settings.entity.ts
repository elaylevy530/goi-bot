import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "whatsapp_dispatch_settings" })
export class WhatsappDispatchSettings {
  @PrimaryColumn({ type: "boolean", default: true })
  id!: boolean;

  @Column({ type: "text", nullable: true })
  couriers_group_id!: string | null;

  @Column({ type: "text", nullable: true })
  couriers_group_name!: string | null;

  @Column({ type: "text", nullable: true })
  movers_group_id!: string | null;

  @Column({ type: "text", nullable: true })
  movers_group_name!: string | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  updated_at!: Date;

  @Column({ type: "uuid", nullable: true })
  updated_by!: string | null;
}
