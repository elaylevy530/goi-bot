import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Bike, Users, Briefcase, Send, Activity,
  MessageSquare, MapPin, BarChart3, Settings, Search, Bell, LogOut, Wallet, Menu, Gift, HandCoins, Sparkles, Rocket, DollarSign, Globe, Banknote, Handshake,
  PanelLeftClose, PanelLeft, ChevronDown, type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { nestLogout } from "@/lib/nest-auth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Ops / Couriers / Money / Settings — Hebrew RTL labels */
const navGroups: NavGroup[] = [
  {
    id: "ops",
    label: "תפעול",
    items: [
      { to: "/dashboard", label: "דאשבורד", icon: LayoutDashboard, exact: true },
      { to: "/active-jobs", label: "משלוחים פעילים", icon: Activity },
      { to: "/jobs", label: "עבודות", icon: Briefcase },
      { to: "/send-job", label: "שליחת עבודה", icon: Send },
      { to: "/quote-requests", label: "הצעות מחיר", icon: HandCoins },
      { to: "/messages", label: "מרכז תמיכה", icon: MessageSquare },
      { to: "/customers", label: "מזמינים", icon: Users },
      { to: "/businesses", label: "ניהול עסקים", icon: Users },
      { to: "/dispatch-groups", label: "קבוצות שידור", icon: MessageSquare },
      { to: "/launch-readiness", label: "מוכנות להשקה", icon: Rocket },
      { to: "/admin-assistant", label: "עוזר AI", icon: Sparkles },
    ],
  },
  {
    id: "couriers",
    label: "שליחים",
    items: [
      { to: "/couriers-admin", label: "שליחים", icon: Bike },
      { to: "/couriers/bank-details", label: "פרטי בנק", icon: Banknote },
      { to: "/couriers-map", label: "מפת שליחים", icon: MapPin },
      { to: "/areas-tags", label: "אזורים וסיווגים", icon: MapPin },
    ],
  },
  {
    id: "money",
    label: "כסף",
    items: [
      { to: "/withdrawals", label: "בקשות משיכה", icon: Wallet },
      { to: "/bonuses", label: "בונוסים", icon: Gift },
      { to: "/pricing", label: "תמחור עסקים", icon: DollarSign },
      { to: "/pricing-rules", label: "תמחור פרטיים", icon: DollarSign },
      { to: "/reports", label: "דוחות", icon: BarChart3 },
      { to: "/partners", label: "שותפים", icon: Handshake },
    ],
  },
  {
    id: "settings",
    label: "הגדרות",
    items: [
      { to: "/pilot-cities", label: "אזורי פעילות", icon: Globe },
      { to: "/whatsapp-provider", label: "ספק וואטסאפ", icon: MessageSquare },
      { to: "/settings", label: "הגדרות מערכת", icon: Settings },
    ],
  },
];

const bottomNav = [
  { to: "/dashboard", label: "ראשי", icon: LayoutDashboard, exact: true },
  { to: "/active-jobs", label: "פעילים", icon: Activity },
  { to: "/send-job", label: "שליחה", icon: Send, primary: true },
  { to: "/jobs", label: "עבודות", icon: Briefcase },
  { to: "/withdrawals", label: "משיכות", icon: Wallet },
];

const SIDEBAR_COLLAPSED_KEY = "goi-admin-sidebar-collapsed";
const SIDEBAR_GROUPS_KEY = "goi-admin-sidebar-groups";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function readOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (!raw) return Object.fromEntries(navGroups.map((g) => [g.id, true]));
    return { ...Object.fromEntries(navGroups.map((g) => [g.id, true])), ...JSON.parse(raw) };
  } catch {
    return Object.fromEntries(navGroups.map((g) => [g.id, true]));
  }
}

function isItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  // Avoid /pricing matching /pricing-rules
  if (item.to === "/pricing" && pathname.startsWith("/pricing-rules")) return false;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function NavList({
  pathname,
  onNavigate,
  collapsed = false,
  openGroups,
  onToggleGroup,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  openGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3 text-right">
      {navGroups.map((group) => {
        const open = collapsed ? true : (openGroups[group.id] ?? true);
        const hasActive = group.items.some((item) => isItemActive(pathname, item));

        return (
          <div key={group.id}>
            {!collapsed && (
              <button
                type="button"
                onClick={() => onToggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase",
                  hasActive ? "text-primary" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80",
                )}
              >
                <span className="flex-1 text-right">{group.label}</span>
                <ChevronDown
                  className={cn("size-3.5 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90")}
                />
              </button>
            )}
            {collapsed && (
              <div className="mx-2 mb-1 border-t border-sidebar-border/60" aria-hidden />
            )}
            {open && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-card text-sm font-semibold transition-colors",
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                        active
                          ? "bg-primary-deep text-primary-foreground shadow-fab"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && (
                        <span className="truncate text-right flex-1">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 text-right", collapsed && "justify-center")}>
      <div className="size-9 rounded-card bg-primary grid place-items-center font-extrabold text-primary-foreground text-lg shrink-0 shadow-fab">
        G
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="font-extrabold text-lg leading-none">Goi</div>
          <div className="text-xs text-sidebar-foreground/60 mt-1 truncate">פאנל ניהול</div>
        </div>
      )}
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
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.id, true])),
  );

  useEffect(() => {
    setCollapsed(readCollapsed());
    setOpenGroups(readOpenGroups());
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    nestLogout();
    toast.success("התנתקת");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div dir="rtl" className="rtl-panel min-h-screen flex bg-bg text-right">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 bg-sidebar text-sidebar-foreground flex-col sticky top-0 h-screen transition-[width] duration-200",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <div className={cn("border-b border-sidebar-border", collapsed ? "px-2 py-4" : "px-4 py-4")}>
          <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
            <Brand collapsed={collapsed} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapsed}
              className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent shrink-0"
              title={collapsed ? "הרחב תפריט" : "כווץ תפריט"}
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
        </div>
        <NavList
          pathname={pathname}
          collapsed={collapsed}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
        />
        <div className={cn("border-t border-sidebar-border", collapsed ? "px-2 py-3" : "px-3 py-3")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            title="יציאה"
            className={cn(
              "w-full text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
          >
            <LogOut className="size-4" />
            {!collapsed && <span className="text-right flex-1">יציאה</span>}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 lg:h-16 bg-surface border-b sticky top-0 z-20 flex items-center px-3 lg:px-6 gap-2 lg:gap-4 pt-[env(safe-area-inset-top)]">
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
              <NavList
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                openGroups={openGroups}
                onToggleGroup={toggleGroup}
              />
              <div className="px-3 py-3 border-t border-sidebar-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMobileOpen(false); signOut(); }}
                  className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                >
                  <LogOut className="size-4" /> <span className="text-right flex-1">יציאה</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-card bg-primary grid place-items-center font-extrabold text-primary-foreground text-sm shrink-0 shadow-fab">G</div>
            <div className="font-bold truncate text-text-strong">Goi</div>
          </div>

          <div className="hidden md:block relative w-80 max-w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <Input className="ps-9" placeholder="חיפוש שליח, מזמין, עבודה..." />
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative shrink-0">
            <Bell className="size-5" />
            <Badge className="absolute -top-1 -start-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px]">·</Badge>
          </Button>
          <div className="hidden sm:flex items-center gap-3 pr-2 border-r ps-3">
            <div className="text-right">
              <div className="text-sm font-semibold leading-tight text-text-strong">מנהל מערכת</div>
              <div className="text-xs text-text-muted">Goi Admin</div>
            </div>
            <div className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold">מ</div>
          </div>
          <div className="sm:hidden size-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm">מ</div>
        </header>

        <div className="p-4 lg:p-6 flex-1 pb-24 lg:pb-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-4 lg:mb-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0 text-right">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate text-text-strong">{title}</h1>
              {subtitle && <p className="text-xs lg:text-sm text-text-muted mt-1 line-clamp-2">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
          </div>
          {children}
        </div>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border flex justify-around items-stretch h-16 px-1 pb-[env(safe-area-inset-bottom)] shadow-bottom-bar">
          {bottomNav.map((item) => {
            const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.primary) {
              return (
                <Link key={item.to} to={item.to} className="flex flex-col items-center justify-center -mt-5">
                  <div className="size-12 rounded-pill grid place-items-center shadow-fab bg-primary text-primary-foreground ring-4 ring-bg">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] mt-1 font-semibold text-text-muted">{item.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] rounded-pill mx-0.5",
                  isActive ? "text-primary bg-primary-soft font-extrabold" : "text-text-muted font-semibold",
                )}
              >
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
