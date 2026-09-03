import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  ChevronLeft,
  Lock,
  LogOut,
  Headphones,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { nestUpdatePassword, isNestPreviewReadOnly } from "@/lib/nest-auth";
import { nestCloseMyCourier } from "@/lib/nest-accounts";
import { signOutCourierSession } from "@/lib/courier-session";
import {
  disablePushForCourier,
  enablePushForCourier,
  ensurePushSubscriptionFresh,
  pushSubscriptionStatus,
  pushSupported,
} from "@/lib/push/subscribe";

export const Route = createFileRoute("/courier/account-settings")({
  head: () => ({ meta: [{ title: "הגדרות חשבון — Goi" }] }),
  component: AccountSettingsPage,
});

type SettingItem = {
  icon: typeof Bell;
  title: string;
  subtitle: string;
  iconColor: string;
  iconBg: string;
  to?: "/courier/messages";
  onClick?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
};

type SettingSection = {
  title?: string;
  items: SettingItem[];
};

function AccountSettingsPage() {
  const { data: me, isPending } = useMyCourier();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const preview = isNestPreviewReadOnly();

  const changePwd = useMutation({
    mutationFn: async () => {
      if (pwd.length < 6) throw new Error("סיסמה חייבת לפחות 6 תווים");
      await nestUpdatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("הסיסמה עודכנה ✓");
      setPwd("");
      setPwdOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignOut = async () => {
    const to = await signOutCourierSession(qc);
    navigate({ to, replace: true });
  };

  const closeAccount = useMutation({
    mutationFn: nestCloseMyCourier,
    onSuccess: async () => {
      toast.success("החשבון נסגר");
      setCloseOpen(false);
      const to = await signOutCourierSession(qc);
      navigate({ to, replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <CourierShell title="הגדרות חשבון" subtitle="">
        <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="size-5 animate-spin" />
          טוען…
        </div>
      </CourierShell>
    );
  }

  const sections: SettingSection[] = [
    ...(me?.id && pushSupported()
      ? [
          {
            items: [
              {
                icon: Bell,
                title: "התראות פוש",
                subtitle: "קבל התראות על שליחויות חדשות ועדכונים חשובים",
                iconColor: "text-green-600",
                iconBg: "bg-green-50",
                toggle: true,
              },
            ],
          } satisfies SettingSection,
        ]
      : []),
    {
      items: [
        {
          icon: Lock,
          title: "שינוי סיסמה",
          subtitle: "עדכן את הסיסמה של החשבון שלך",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          onClick: () => {
            setPwd("");
            setPwdOpen(true);
          },
        },
      ],
    },
    {
      title: "עזרה ותמיכה",
      items: [
        {
          icon: Headphones,
          title: "צור קשר עם התמיכה",
          subtitle: "אנחנו כאן לעזור",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          to: "/courier/messages",
        },
      ],
    },
    {
      items: [
        {
          icon: LogOut,
          title: "יציאה מהחשבון",
          subtitle: "צא מהחשבון הנוכחי",
          iconColor: "text-red-600",
          iconBg: "bg-red-50",
          showArrow: true,
          onClick: () => {
            void handleSignOut();
          },
        },
      ],
    },
  ];

  return (
    <CourierShell title="הגדרות חשבון" subtitle="">
      <div className="pb-6 space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3">
            {section.title && (
              <div className="px-4 pt-2">
                <h3 className="text-sm font-medium text-slate-500">{section.title}</h3>
              </div>
            )}
            <div className="bg-white rounded-lg overflow-hidden divide-y divide-slate-100">
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.toggle && me?.id) {
                  return (
                    <PushToggleRow
                      key={item.title}
                      courierId={me.id}
                      title={item.title}
                      subtitle={item.subtitle}
                      icon={Icon}
                      iconColor={item.iconColor}
                      iconBg={item.iconBg}
                    />
                  );
                }

                const ItemWrapper = item.to ? Link : "button";
                const wrapperProps = item.to
                  ? { to: item.to }
                  : { type: "button" as const, onClick: item.onClick };

                return (
                  <ItemWrapper
                    key={item.title}
                    {...wrapperProps}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
                  >
                    {item.showArrow && (
                      <ChevronLeft className="size-5 text-slate-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.subtitle}</p>
                    </div>
                    <div
                      className={cn(
                        "size-10 rounded-full flex items-center justify-center shrink-0",
                        item.iconBg,
                      )}
                    >
                      <Icon className={cn("size-5", item.iconColor)} />
                    </div>
                  </ItemWrapper>
                );
              })}
            </div>
          </div>
        ))}

        {!preview && (
          <div className="bg-white rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setCloseOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
            >
              <ChevronLeft className="size-5 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-600 mb-0.5">מחיקת חשבון</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  סגירת החשבון לצמיתות וניתוק מהמערכת
                </p>
              </div>
              <div className="size-10 rounded-full flex items-center justify-center shrink-0 bg-red-50">
                <Trash2 className="size-5 text-red-600" />
              </div>
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-2 pt-4 pb-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-slate-900">GO!</span>
          </div>
        </div>
      </div>

      <Dialog
        open={pwdOpen}
        onOpenChange={(open) => {
          setPwdOpen(open);
          if (!open) setPwd("");
        }}
      >
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>שינוי סיסמה</DialogTitle>
            <DialogDescription>הסיסמה חייבת לפחות 6 תווים</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-end block">סיסמה חדשה</Label>
            <Input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              dir="ltr"
              minLength={6}
              placeholder="לפחות 6 תווים"
            />
          </div>
          <DialogFooter>
            <Button
              className="bg-primary-deep hover:bg-primary-deep/90"
              onClick={() => changePwd.mutate()}
              disabled={changePwd.isPending || pwd.length < 6}
            >
              {changePwd.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              עדכן סיסמה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>מחיקת חשבון</DialogTitle>
            <DialogDescription>
              פעולה זו אינה הפיכה. החשבון ייסגר ותנותק מהמערכת. היסטוריית העבודות לא תימחק.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>
              ביטול
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => closeAccount.mutate()}
              disabled={closeAccount.isPending}
            >
              {closeAccount.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              מחיקת חשבון
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CourierShell>
  );
}

function PushToggleRow({
  courierId,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  courierId: string;
  title: string;
  subtitle: string;
  icon: typeof Bell;
  iconColor: string;
  iconBg: string;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pushSubscriptionStatus().then((s) => {
      if (cancelled) return;
      setEnabled(s === "granted");
      if (s === "granted") {
        ensurePushSubscriptionFresh(courierId).catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [courierId]);

  const onToggle = async (next: boolean) => {
    if (busy || enabled === null) return;
    setBusy(true);
    try {
      if (next) {
        const res = await enablePushForCourier(courierId);
        if (res.ok) {
          setEnabled(true);
          toast.success("התראות Push הופעלו — תקבל התראות גם כשהאפליקציה סגורה");
        } else if (res.reason === "denied") {
          setEnabled(false);
          toast.error("ההרשאה נדחתה — אפשר להפעיל מהגדרות הדפדפן/אפליקציה");
        } else {
          toast.error("לא הצלחנו להפעיל Push — נסה שוב מאוחר יותר");
        }
      } else {
        await disablePushForCourier(courierId);
        setEnabled(false);
        toast.success("התראות Push כובו במכשיר זה");
      }
    } catch {
      toast.error("לא הצלחנו לעדכן את ההתראות");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex items-center gap-3 p-4 text-right">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
      {enabled === null ? (
        <Loader2 className="size-4 animate-spin text-slate-400 shrink-0" />
      ) : (
        <Switch
          checked={enabled}
          disabled={busy}
          onCheckedChange={(v) => void onToggle(v)}
          className="shrink-0"
        />
      )}
      <div
        className={cn(
          "size-10 rounded-full flex items-center justify-center shrink-0",
          iconBg,
        )}
      >
        <Icon className={cn("size-5", iconColor)} />
      </div>
    </div>
  );
}
