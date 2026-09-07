import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { enableCourierLocationSharing } from "@/lib/courier-location";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EnableLocationSheet({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const close = () => {
    if (pending) return;
    setHint(null);
    onOpenChange(false);
  };

  const enable = async () => {
    setPending(true);
    setHint(null);
    try {
      const res = await enableCourierLocationSharing();
      await qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      toast.success(
        res.hasFix
          ? "מיקום דולק — תקבלו גם הצעות לפי קרבה"
          : "מיקום דולק. אם אין נקודה עדיין, ודאו ש־GPS במכשיר דולק",
      );
      setHint(null);
      onOpenChange(false);
    } catch (e) {
      setHint(
        e instanceof Error
          ? e.message
          : "לא הצלחנו להפעיל מיקום כרגע. אפשר להמשיך לפי האזורים שבחרת.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="rounded-t-[1.75rem] border-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 [&>button]:hidden"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" aria-hidden />
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-[linear-gradient(180deg,#E8F8E4_0%,#F6FCF5_100%)] text-primary shadow-[0_8px_20px_rgba(53,173,41,0.16)]">
            <MapPin className="size-7" strokeWidth={2.2} aria-hidden />
          </span>
          <SheetTitle className="mt-4 text-[1.35rem] font-extrabold text-text-strong">
            להדליק מיקום?
          </SheetTitle>
          <SheetDescription className="mt-2 text-[13px] leading-relaxed text-text-muted">
            עם מיקום תקבלו גם משלוחים קרובים אליכם עכשיו. בלי — ההצעות יגיעו לפי האזורים והערים שסימנתם.
          </SheetDescription>
          {hint && (
            <p className="mt-3 text-[12px] font-semibold leading-snug text-text-muted">{hint}</p>
          )}
          <div className="mt-5 flex w-full flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-full font-extrabold"
              disabled={pending}
              onClick={() => void enable()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "מדליקים…" : "הדליקו מיקום"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-full font-bold text-text-muted"
              disabled={pending}
              onClick={close}
            >
              המשך בלי מיקום
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
