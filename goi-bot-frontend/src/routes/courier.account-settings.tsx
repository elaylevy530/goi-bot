import { createFileRoute, Link } from "@tanstack/react-router";
import { CourierShell } from "@/components/CourierShell";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  ChevronLeft,
  HelpCircle,
  Lock,
  Shield,
  FileText,
  Scale,
  ShieldCheck,
  LogOut,
  Trash2,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  href?: string;
  onClick?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
};

type SettingSection = {
  title?: string;
  items: SettingItem[];
};

function AccountSettingsPage() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const appVersion = "1.3.6";

  const sections: SettingSection[] = [
    {
      items: [
        {
          icon: Bell,
          title: "התראות פוש",
          subtitle: "קבל התראות על שליחויות חדשות ועדכונים חשובים",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          toggle: true,
          toggleValue: pushNotifications,
          onToggleChange: setPushNotifications,
        },
      ],
    },
    {
      items: [
        {
          icon: Lock,
          title: "שינוי סיסמה",
          subtitle: "עדכן את הסיסמה של החשבון שלך",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
        {
          icon: Shield,
          title: "אבטחה",
          subtitle: "הגדרות אבטחה ואימות דו-שלבי",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
      ],
    },
    {
      title: "ממשקים והסכמים",
      items: [
        {
          icon: FileText,
          title: "הפסק שירות",
          subtitle: "הסכם עליו חתמת בעת ההצטרפות",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
        {
          icon: FileText,
          title: "תנאי השימוש",
          subtitle: "כללי השימוש באפליקציית GO!",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
        {
          icon: ShieldCheck,
          title: "מדיניות פרטיות",
          subtitle: "כיצד אנו אוספים ומגינים על המידע שלך",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
      ],
    },
    {
      title: "עזרה ותמיכה",
      items: [
        {
          icon: HelpCircle,
          title: "שאלות נפוצות",
          subtitle: "מענה לשאלות נפוצות",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
        },
        {
          icon: Headphones,
          title: "צור קשר עם התמיכה",
          subtitle: "אנחנו כאן לעזור",
          iconColor: "text-green-600",
          iconBg: "bg-green-50",
          showArrow: true,
          href: "#",
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
            // Handle logout
          },
        },
        {
          icon: Trash2,
          title: "מחיקת חשבון",
          subtitle: "מחיקת החשבון לצמיתות",
          iconColor: "text-red-600",
          iconBg: "bg-red-50",
          showArrow: true,
          href: "#",
        },
      ],
    },
  ];

  return (
    <CourierShell
      title="הגדרות חשבון"
      subtitle=""
      hideBackButton={false}
    >
      <div className="pb-6 space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3">
            {section.title && (
              <div className="px-4 pt-2">
                <h3 className="text-sm font-medium text-slate-500">
                  {section.title}
                </h3>
              </div>
            )}
            <div className="bg-white rounded-lg overflow-hidden divide-y divide-slate-100">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const ItemWrapper = item.href ? Link : "button";
                const wrapperProps = item.href
                  ? { to: item.href as any }
                  : {
                      type: "button" as const,
                      onClick: item.onClick,
                    };

                return (
                  <ItemWrapper
                    key={itemIndex}
                    {...wrapperProps}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
                  >
                    {item.toggle ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 mb-0.5">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {item.subtitle}
                          </p>
                        </div>
                        <Switch
                          checked={item.toggleValue}
                          onCheckedChange={item.onToggleChange}
                          className="shrink-0"
                        />
                        <div
                          className={cn(
                            "size-10 rounded-full flex items-center justify-center shrink-0",
                            item.iconBg
                          )}
                        >
                          <Icon className={cn("size-5", item.iconColor)} />
                        </div>
                      </>
                    ) : (
                      <>
                        {item.showArrow && (
                          <ChevronLeft className="size-5 text-slate-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 mb-0.5">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {item.subtitle}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "size-10 rounded-full flex items-center justify-center shrink-0",
                            item.iconBg
                          )}
                        >
                          <Icon className={cn("size-5", item.iconColor)} />
                        </div>
                      </>
                    )}
                  </ItemWrapper>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-center gap-2 pt-4 pb-2">
          <p className="text-xs text-slate-500">גרסת האפליקציה {appVersion}</p>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-slate-900">GO!</span>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}
