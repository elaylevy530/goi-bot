import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Bike, Users, Briefcase, Send, Bot,
  MessageSquare, MapPin, BarChart3, Settings, Search, Bell, LogOut, Wallet, Menu, Gift, HandCoins, Sparkles, Rocket, DollarSign, Globe, Banknote,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { nestLogout } from "@/lib/nest-auth";

const navItems = [
  { to: "/dashboard", label: "דאשבורד", icon: LayoutDashboard, exact: true },
  { to: "/launch-readiness", label: "מוכנות להשקה 🚀", icon: Rocket },
  { to: "/admin-assistant", label: "עוזר AI ✨", icon: Sparkles },
  { to: "/couriers-admin", label: "שליחים", icon: Bike },
  { to: "/couriers/bank-details", label: "פרטי בנק שליחים", icon: Banknote },
  { to: "/couriers-map", label: "מפת שליחים", icon: MapPin },
  { to: "/customers", label: "מזמינים", icon: Users },
  { to: "/businesses", label: "ניהול עסקים", icon: Users },
  { to: "/jobs", label: "עבודות", icon: Briefcase },
  { to: "/send-job", label: "שליחת עבודה", icon: Send },
  { to: "/quote-requests", label: "הצעות מחיר", icon: HandCoins },
  { to: "/messages", label: "מרכז תמיכה", icon: MessageSquare },
  { to: "/withdrawals", label: "בקשות משיכה", icon: Wallet },
  { to: "/bonuses", label: "ניהול בונוסים", icon: Gift },
  { to: "/pricing", label: "תמחור (עסקים)", icon: DollarSign },
  { to: "/pricing-rules", label: "כללי תמחור פרטיים", icon: DollarSign },
  { to: "/pilot-cities", label: "אזורי פעילות", icon: Globe },
  { to: "/whatsapp-provider", label: "ספק וואטסאפ (Cloud API)", icon: MessageSquare },

  { to: "/dispatch-groups", label: "קבוצות שידור משלוחים", icon: MessageSquare },

  { to: "/areas-tags", label: "אזורים וסיווגים", icon: MapPin },
  { to: "/reports", label: "דוחות", icon: BarChart3 },
  { to: "/settings", label: "הגדרות", icon: Settings },
];

// Bottom-tab items for mobile (most-used 5)
const bottomNav = [
  { to: "/dashboard", label: "ראשי", icon: LayoutDashboard, exact: true },
  { to: "/couriers-admin", label: "שליחים", icon: Bike },
  { to: "/send-job", label: "שליחה", icon: Send, primary: true },
  { to: "/jobs", label: "עבודות", icon: Briefcase },
  { to: "/withdrawals", label: "משיכות", icon: Wallet },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 text-right">
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate text-right flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center justify-start gap-3 text-right">
      <div className="size-9 rounded-lg bg-primary grid place-items-center font-extrabold text-primary-foreground text-lg shrink-0">G</div>
      <div className="min-w-0">
        <div className="font-extrabold text-lg leading-none">Goi</div>
        <div className="text-xs text-sidebar-foreground/60 mt-1 truncate">פאנל ניהול</div>
      </div>
    </div>
  );
}

export function AdminLayout({
  title, subtitle, actions, children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    nestLogout();
    toast.success("התנתקת");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div dir="rtl" className="rtl-panel min-h-screen flex bg-muted/30 text-right">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar text-sidebar-foreground flex-col sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <NavList pathname={pathname} />
        <div className="px-3 py-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
            <LogOut className="size-4" /> <span className="text-right flex-1">יציאה</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 lg:h-16 bg-background border-b sticky top-0 z-20 flex items-center px-3 lg:px-6 gap-2 lg:gap-4">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" dir="rtl" className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col text-right">
              <SheetHeader className="px-6 py-5 border-b border-sidebar-border">
                <SheetTitle asChild><div><Brand /></div></SheetTitle>
              </SheetHeader>
              <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="px-3 py-3 border-t border-sidebar-border">
                <Button variant="ghost" size="sm" onClick={() => { setMobileOpen(false); signOut(); }} className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
                  <LogOut className="size-4" /> <span className="text-right flex-1">יציאה</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-md bg-primary grid place-items-center font-extrabold text-primary-foreground text-sm shrink-0">G</div>
            <div className="font-bold truncate">Goi</div>
          </div>

          {/* Desktop search */}
          <div className="hidden md:block relative w-80 max-w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="ps-9" placeholder="חיפוש שליח, מזמין, עבודה..." />
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative shrink-0">
            <Bell className="size-5" />
            <Badge className="absolute -top-1 -start-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px]">·</Badge>
          </Button>
          <div className="hidden sm:flex items-center gap-3 pr-2 border-r ps-3">
            <div className="text-right">
              <div className="text-sm font-semibold leading-tight">מנהל מערכת</div>
              <div className="text-xs text-muted-foreground">Goi Admin</div>
            </div>
            <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold">מ</div>
          </div>
          <div className="sm:hidden size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm">מ</div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6 flex-1 pb-24 lg:pb-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 lg:mb-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0 text-right">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs lg:text-sm text-muted-foreground mt-1 line-clamp-2">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
          </div>
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t flex justify-around items-stretch h-16 px-1 pb-[env(safe-area-inset-bottom)]">
          {bottomNav.map((item) => {
            const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.primary) {
              return (
                <Link key={item.to} to={item.to} className="flex flex-col items-center justify-center -mt-5">
                  <div className={`size-12 rounded-full grid place-items-center shadow-lg ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground">{item.label}</span>
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to} className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
