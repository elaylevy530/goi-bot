import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { isNestPreviewReadOnly } from "@/lib/nest-preview-cache";
import { isStandalone } from "@/lib/pwa";
import { enablePushForCourier, ensurePushSubscriptionFresh, pushSupported } from "@/lib/push/subscribe";
import { enablePushForBusiness } from "@/lib/push/subscribe-more";
import { toast } from "sonner";

const DISMISS_KEY = "goi:push:prompt-dismissed";
const JUST_INSTALLED_KEY = "goi:push:just-installed";

type Props = {
  kind: "courier" | "business";
  ownerId?: string | null;
};

function markJustInstalled() {
  try {
    sessionStorage.setItem(JUST_INSTALLED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wasJustInstalled() {
  try {
    return sessionStorage.getItem(JUST_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissForSession() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function shouldAskForPush() {
  return isStandalone() || wasJustInstalled() || isAndroid();
}

export function HomeScreenPushPrompt({ kind, ownerId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onInstalled = () => {
      markJustInstalled();
      if (Notification.permission === "default") setOpen(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  useEffect(() => {
    if (!ownerId || !pushSupported() || isNestPreviewReadOnly()) return;

    const run = async () => {
      if (Notification.permission === "granted") {
        if (kind === "courier") {
          await ensurePushSubscriptionFresh(ownerId).catch(() => undefined);
        } else {
          await enablePushForBusiness(ownerId).catch(() => undefined);
        }
        return;
      }
      if (Notification.permission === "denied") return;
      if (wasDismissed()) return;
      if (!shouldAskForPush()) return;
      setOpen(true);
    };

    void run();
  }, [kind, ownerId]);

  const close = () => {
    if (pending) return;
    dismissForSession();
    setHint(null);
    setOpen(false);
  };

  const enable = async () => {
    if (!ownerId) return;
    setPending(true);
    setHint(null);
    try {
      const res =
        kind === "courier"
          ? await enablePushForCourier(ownerId)
          : await enablePushForBusiness(ownerId);
      if (!res.ok) {
        setHint(
          res.reason === "denied"
            ? "ההרשאה נחסמה. אפשר להפעיל התראות אחר כך מהגדרות המכשיר או מהחשבון."
            : "המכשיר לא תומך בהתראות פוש כרגע.",
        );
        return;
      }
      toast.success(
        kind === "courier"
          ? "התראות דולקות — תקבלו פוש למשלוח חדש ולהודעות מהעסק"
          : "התראות דולקות — תקבלו פוש כשהשליח כותב או יש עדכון למשלוח",
      );
      setOpen(false);
    } catch {
      setHint("לא הצלחנו להפעיל התראות כרגע. אפשר לנסות שוב מההגדרות.");
    } finally {
      setPending(false);
    }
  };

  if (!ownerId || !pushSupported()) return null;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="rounded-t-[1.75rem] border-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 [&>button]:hidden"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" aria-hidden />
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-[linear-gradient(180deg,#E8F8E4_0%,#F6FCF5_100%)] text-primary shadow-[0_8px_20px_rgba(53,173,41,0.16)]">
            <Bell className="size-7" strokeWidth={2.2} aria-hidden />
          </span>
          <SheetTitle className="mt-4 text-[1.35rem] font-extrabold text-text-strong">
            להפעיל התראות?
          </SheetTitle>
          <SheetDescription className="mt-2 text-[13px] leading-relaxed text-text-muted">
            {kind === "courier"
              ? "כדי לקבל פוש על המסך כשנכנס משלוח חדש, הודעה מעסק, או עדכון מהמערכת — גם כשהאפליקציה סגורה."
              : "כדי לקבל פוש על המסך כשהשליח כותב, או כשיש עדכון למשלוח — גם כשהאפליקציה סגורה."}
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
              {pending ? "מדליקים…" : "הפעלת התראות"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-full font-bold text-text-muted"
              disabled={pending}
              onClick={close}
            >
              אחר כך
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CourierPushPrompt({ courierId }: { courierId?: string | null }) {
  return <HomeScreenPushPrompt kind="courier" ownerId={courierId} />;
}
