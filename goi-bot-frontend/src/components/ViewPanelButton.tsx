import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  nestPreviewHomePath,
  nestStartPreview,
  type PreviewPanel,
} from "@/lib/nest-auth";

type Props = {
  panel: PreviewPanel;
  entityId: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

/** Admin entity page CTA: open the live product panel in read-only preview. */
export function ViewPanelButton({
  panel,
  entityId,
  label = "צפה בפאנל",
  variant = "default",
  size = "default",
  className,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      const session = await nestStartPreview(panel, entityId);
      qc.clear();
      const home = nestPreviewHomePath(session.preview?.panel ?? panel);
      toast.success("נכנסת לתצוגת מנהל (לקריאה בלבד)");
      await navigate({ to: home, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "לא ניתן לפתוח תצוגה מקדימה");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || !entityId}
      onClick={() => void onClick()}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Eye className="size-4" />
      )}
      {label}
    </Button>
  );
}
