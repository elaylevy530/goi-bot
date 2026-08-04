import { IsIn, IsUUID } from "class-validator";
import type { PreviewPanel } from "../auth.types";

export class StartPreviewDto {
  @IsIn(["courier", "business", "customer"])
  panel!: PreviewPanel;

  /** Courier id when panel is courier; customer id when panel is business or customer. */
  @IsUUID()
  entityId!: string;
}
