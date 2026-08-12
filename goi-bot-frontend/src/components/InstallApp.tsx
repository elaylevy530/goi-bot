import { useEffect, useState } from "react";
import { Download, Share, Plus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useInstallPrompt,
  useAppVersionUpdate,
  isBannerDismissed,
  dismissInstallBanner,
} from "@/lib/pwa";
import { toast } from "sonner";

/** Sidebar/nav-style install entry. Always renders if not installed — on iOS opens
 *  the tutorial sheet, on Android/desktop fires the native prompt. */
export function InstallAppSidebarItem({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { installable, installed, install, isIOS } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (installed) return null;
  // Hide on Android/desktop until the browser confirms installability.
  if (!installable && !isIOS) return null;

  const onClick = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    const outcome = await install();
    if (outcome === "accepted") toast.success("Goi מותקנת — תוכלו לפתוח אותה ממסך הבית");
  };

  const base =
    variant === "dark"
      ? "bg-[#35AD29] text-white hover:bg-[#2d9623]"
      : "bg-[#35AD29] text-white hover:bg-[#2d9623]";

  return (
    <>
      <button
        onClick={onClick}
        className={`m-3 mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-colors ${base}`}
        dir="rtl"
      >
        <Download className="size-4 shrink-0" />
        <span className="flex-1 text-right">התקן את האפליקציה</span>
      </button>
      <IOSInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}


/** Big install button for inside dashboards. */
export function InstallAppButton({ className }: { className?: string }) {
  const { installable, installed, install, isIOS } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);

  if (installed) return null;
  if (!installable && !isIOS) return null;

  const onClick = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    const outcome = await install();
    if (outcome === "accepted") toast.success("Goi מותקנת — תוכלו לפתוח אותה ממסך הבית");
    else if (outcome === "dismissed") toast("ביטלתם את ההתקנה");
  };

  return (
    <>
      <Button
        onClick={onClick}
        className={
          className ??
          "h-12 gap-2 rounded-2xl bg-[#35AD29] px-5 text-white shadow-sm hover:bg-[#2E9A24]"
        }
      >
        <Download className="size-5" />
        <span className="font-semibold">התקנת אפליקציית Goi</span>
      </Button>
      <IOSInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}

/** Slim bottom banner for mobile — shows once per session. */
export function InstallBanner() {
  const { installable, installed, install, isIOS } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() =>
    typeof window === "undefined" ? true : isBannerDismissed(),
  );

  // Only show on small viewports
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (installed || hidden || !isMobile) return null;
  if (!installable && !isIOS) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    const outcome = await install();
    if (outcome === "accepted") setHidden(true);
  };
  const handleDismiss = () => {
    dismissInstallBanner();
    setHidden(true);
  };

  return (
    <>
      <div
        dir="rtl"
        className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#35AD29]/10 text-[#35AD29]">
            <Download className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">התקינו את Goi במסך הבית</div>
            <div className="text-xs text-slate-500">
              קבלו גישה מהירה להזמנות ולעבודות
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-[#35AD29] text-white hover:bg-[#2E9A24]"
              >
                התקנה
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                לא עכשיו
              </Button>
            </div>
          </div>
          <button
            aria-label="סגירה"
            onClick={handleDismiss}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <IOSInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}

function IOSInstallSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">התקנת Goi באייפון</DialogTitle>
          <DialogDescription className="text-right">
            כמה שלבים קצרים והאפליקציה תהיה במסך הבית
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-right">
          <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600">
              <Share className="size-5" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold">1.</span> לחצו על כפתור השיתוף בדפדפן
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Plus className="size-5" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold">2.</span> בחרו "הוספה למסך הבית"
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Download className="size-5" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold">3.</span> לחצו על "הוסף"
            </div>
          </li>
        </ol>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#35AD29] text-white hover:bg-[#2E9A24]"
          >
            הבנתי
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Popup when a new deployed build is available. */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate, dismissUpdate } = useAppVersionUpdate();
  const [busy, setBusy] = useState(false);
  if (!updateAvailable) return null;

  const onUpdate = async () => {
    setBusy(true);
    await applyUpdate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismissUpdate(); }}>
      <DialogContent dir="rtl" className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">יש עדכון לאפליקציה</DialogTitle>
          <DialogDescription className="text-right">
            גרסה חדשה של Goi מוכנה. רעננו כדי לקבל את השינויים.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-primary-soft p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <RefreshCw className="size-5" />
          </div>
          <p className="flex-1 text-sm font-medium text-text-strong text-right">
            מומלץ לעדכן עכשיו כדי להמשיך לעבוד עם הגרסה העדכנית.
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => void onUpdate()}
            disabled={busy}
            className="w-full min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "מרענן…" : "עדכון עכשיו"}
          </Button>
          <Button
            variant="ghost"
            onClick={dismissUpdate}
            disabled={busy}
            className="w-full min-h-11"
          >
            אחר כך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
