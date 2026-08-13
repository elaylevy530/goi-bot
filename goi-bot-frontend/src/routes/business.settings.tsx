import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { nestUpdatePassword } from "@/lib/nest-auth";
import { nestUpdateMyCustomer } from "@/lib/nest-accounts";
import { ChevronLeft, Code2, Heart, Loader2, LogOut, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/settings")({
  head: () => ({ meta: [{ title: "הגדרות — Goi עסקים" }] }),
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const [newPwd, setNewPwd] = useState("");
  const [notifyWa, setNotifyWa] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [accountMode, setAccountMode] = useState<"private" | "business">("business");
  const [watchdogEnabled, setWatchdogEnabled] = useState(true);
  const [reminderMin, setReminderMin] = useState(5);
  const [redispatchMin, setRedispatchMin] = useState(5);
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const [favFirst, setFavFirst] = useState(true);
  const [favFallback, setFavFallback] = useState(3);

  useEffect(() => {
    if (me) {
      setNotifyWa((me as any).notify_wa ?? true);
      setNotifyEmail((me as any).notify_email ?? true);
      setAccountMode(((me as any).account_mode === "private") ? "private" : "business");
      setWatchdogEnabled((me as any).pickup_watchdog_enabled ?? true);
      setReminderMin((me as any).pickup_reminder_minutes ?? 5);
      setRedispatchMin((me as any).pickup_redispatch_minutes ?? 5);
      setNotifyRecipient((me as any).notify_recipient_enabled ?? true);
      setFavFirst((me as any).favorites_first_enabled ?? true);
      setFavFallback((me as any).favorites_fallback_minutes ?? 3);
    }
  }, [me]);

  const pwd = useMutation({
    mutationFn: async () => {
      if (newPwd.length < 6) throw new Error("סיסמה חייבת לפחות 6 תווים");
      await nestUpdatePassword(newPwd);
    },
    onSuccess: () => { toast.success("הסיסמה עודכנה"); setNewPwd(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePrefs = useMutation({
    mutationFn: async (next: { notify_wa?: boolean; notify_email?: boolean; account_mode?: "private" | "business"; pickup_watchdog_enabled?: boolean; pickup_reminder_minutes?: number; pickup_redispatch_minutes?: number; notify_recipient_enabled?: boolean; favorites_first_enabled?: boolean; favorites_fallback_minutes?: number }) => {
      if (!me) return;
      const patch: any = {};
      if (next.notify_wa !== undefined) patch.notify_wa = next.notify_wa;
      if (next.notify_email !== undefined) patch.notify_email = next.notify_email;
      if (next.account_mode !== undefined) patch.account_mode = next.account_mode;
      if (next.pickup_watchdog_enabled !== undefined) patch.pickup_watchdog_enabled = next.pickup_watchdog_enabled;
      if (next.pickup_reminder_minutes !== undefined) patch.pickup_reminder_minutes = next.pickup_reminder_minutes;
      if (next.pickup_redispatch_minutes !== undefined) patch.pickup_redispatch_minutes = next.pickup_redispatch_minutes;
      if (next.notify_recipient_enabled !== undefined) patch.notify_recipient_enabled = next.notify_recipient_enabled;
      if (next.favorites_first_enabled !== undefined) patch.favorites_first_enabled = next.favorites_first_enabled;
      if (next.favorites_fallback_minutes !== undefined) patch.favorites_fallback_minutes = next.favorites_fallback_minutes;
      await nestUpdateMyCustomer(patch);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-me"] }); toast.success("ההעדפות נשמרו"); },
    onError: (e: Error) => toast.error(e.message),
  });



  const toggleWa = (v: boolean) => { setNotifyWa(v); savePrefs.mutate({ notify_wa: v }); };
  const toggleEmail = (v: boolean) => { setNotifyEmail(v); savePrefs.mutate({ notify_email: v }); };
  const changeMode = (v: "private" | "business") => { setAccountMode(v); savePrefs.mutate({ account_mode: v }); };

  // Favorites list
  const favorites = useQuery({
    queryKey: ["business-favorites", me?.id],
    enabled: false,
    queryFn: async () => {
      throw new Error("Business favorites — migrate to Nest /api/accounts/customers/me/favorites");
    },
  });
  const removeFavorite = useMutation({
    mutationFn: async () => {
      throw new Error("Business favorites — migrate to Nest /api/accounts/customers/me/favorites");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-favorites", me?.id] }); toast.success("הוסר"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    const { nestLogout } = await import("@/lib/nest-auth");
    nestLogout();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <BusinessShell title="הגדרות" subtitle="חשבון, התראות וצוות">
      <div className="flex flex-col gap-6 p-4 lg:flex-row lg:p-8">
        <aside className="w-full shrink-0 space-y-4 lg:w-[22.5rem]">
          <nav className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {[
              { href: "/business/profile", label: "פרטי עסק", to: "/business/profile" },
              { href: "/business/team", label: "משתמשים והרשאות", to: "/business/team" },
              { href: "#biz-notify", label: "התראות וסמס" },
              { href: "/business/integrations", label: "מפתחים ו-API", to: "/business/integrations" },
              { href: "#biz-security", label: "אבטחת חשבון" },
            ].map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to as never}
                  className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-text-strong last:border-0 hover:bg-muted"
                >
                  {item.label}
                  <ChevronLeft className="size-4 text-text-muted" />
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-text-strong last:border-0 hover:bg-muted"
                >
                  {item.label}
                  <ChevronLeft className="size-4 text-text-muted" />
                </a>
              ),
            )}
          </nav>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <Code2 className="size-4 text-primary" />
              <p className="text-sm font-bold text-text-strong">חיבור ה-API שלך</p>
            </div>
            <p className="text-xs text-text-muted">מפתחות, webhooks והזמנות אוטומטיות מנוהלים במסך האינטגרציות.</p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to="/business/integrations">למסך האינטגרציות</Link>
            </Button>
          </div>
        </aside>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card id="biz-account" className="scroll-mt-24 rounded-2xl border-border shadow-card lg:col-span-2">
          <CardHeader><CardTitle>סוג חשבון</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => changeMode("private")} className={`text-right rounded-xl border-2 p-4 transition ${accountMode === "private" ? "border-[#35AD29] bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="font-extrabold text-slate-900">חשבון אישי</div>
                <div className="text-xs text-slate-500 mt-1">למשתמש פרטי — משלוח חבילה / מתנה / מסמך פעם בכמה זמן.</div>
              </button>
              <button onClick={() => changeMode("business")} className={`text-right rounded-xl border-2 p-4 transition ${accountMode === "business" ? "border-[#35AD29] bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="font-extrabold text-slate-900">חשבון עסקי</div>
                <div className="text-xs text-slate-500 mt-1">לעסק — סניפים, משמרות, קווי חלוקה, חיוב חודשי וחשבוניות.</div>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">הבחירה משנה את התפריט והאפשרויות בפאנל. <Link to="/business/profile" className="font-bold text-primary underline">עריכת פרטי העסק</Link></p>
          </CardContent>
        </Card>

        <Card id="biz-notify" className="scroll-mt-24 rounded-2xl border-border shadow-card">
          <CardHeader><CardTitle>התראות</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between"><span>קבל עדכונים בוואטסאפ</span><Switch checked={notifyWa} onCheckedChange={toggleWa} /></label>
            <label className="flex items-center justify-between"><span>קבל עדכונים באימייל</span><Switch checked={notifyEmail} onCheckedChange={toggleEmail} /></label>
            <p className="text-xs text-slate-500">ההעדפות נשמרות אוטומטית.</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle>עדכוני נמען בוואטסאפ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              כל פעם שהשליח מתקדם — יוצא לאיסוף, אסף את החבילה, ונמסר — נשלחת הודעת ווצאפ אוטומטית לנמען (הלקוח הסופי) עם קישור למעקב חי.
            </p>
            {!(me as any)?.notify_recipient_allowed && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                שירות בתשלום נוסף — צרו קשר עם מנהל המערכת להפעלה.
              </div>
            )}
            <label className="flex items-center justify-between">
              <span>שלח עדכונים אוטומטיים לנמען</span>
              <Switch
                checked={notifyRecipient && !!(me as any)?.notify_recipient_allowed}
                disabled={!(me as any)?.notify_recipient_allowed}
                onCheckedChange={(v) => { setNotifyRecipient(v); savePrefs.mutate({ notify_recipient_enabled: v }); }}
              />
            </label>
            <p className="text-xs text-slate-500">ניתן לשנות לכל הזמנה בנפרד במסך יצירת המשלוח (אם הופעל ע״י המנהל).</p>
          </CardContent>
        </Card>


        <Card className="rounded-2xl border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="size-4 text-rose-500" /> שליחים מועדפים</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              שליחים שסימנת כמועדפים יקבלו את ההזמנה ראשונים. אם אף אחד מהם לא לוקח תוך X דקות — ההצעה נשלחת אוטומטית לכל שאר השליחים המתאימים.
            </p>
            <label className="flex items-center justify-between">
              <span>שלח קודם לשליחים מועדפים</span>
              <Switch
                checked={favFirst}
                onCheckedChange={(v) => { setFavFirst(v); savePrefs.mutate({ favorites_first_enabled: v }); }}
              />
            </label>
            <div>
              <Label>זמן המתנה למועדפים לפני פיזור לכולם (דקות)</Label>
              <Input
                type="number" min={1} max={60} value={favFallback}
                disabled={!favFirst}
                onChange={(e) => setFavFallback(Math.max(1, Number(e.target.value) || 1))}
                onBlur={() => savePrefs.mutate({ favorites_fallback_minutes: favFallback })}
              />
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-sm font-semibold text-slate-700 mb-2">
                הרשימה שלי ({favorites.data?.filter((f) => f.status === "preferred").length ?? 0} מועדפים)
              </div>
              {favorites.isLoading ? (
                <div className="text-sm text-slate-500">טוען...</div>
              ) : !favorites.data?.length ? (
                <p className="text-sm text-slate-500">עדיין אין שליחים ברשימה. במסך פרטי משלוח תוכל ללחוץ ❤️ "שמור כמועדף".</p>
              ) : (
                <ul className="space-y-2">
                  {favorites.data.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {f.couriers?.full_name || "—"}
                          {f.status === "blocked" && <span className="mr-2 text-xs text-red-600">(חסום)</span>}
                          {f.status === "preferred" && <span className="mr-2 text-xs text-rose-600">❤️ מועדף</span>}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {f.couriers?.vehicle_label || ""} {f.couriers?.base_city ? `· ${f.couriers.base_city}` : ""} {f.couriers?.whatsapp_phone ? `· ${f.couriers.whatsapp_phone}` : ""}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFavorite.mutate(f.id)} className="text-slate-500 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm lg:col-span-2">

          <CardHeader><CardTitle>מעקב אחר יציאה לאיסוף</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              אם השליח אישר את המשלוח ולא לחץ "יצאתי לאיסוף" — נשלחת לו תזכורת בוואטסאפ. אם עדיין לא הגיב לאחר הזמן השני — המשלוח משוחרר אוטומטית ונשלח לשליחים חדשים.
            </p>
            <label className="flex items-center justify-between">
              <span>הפעל מעקב אוטומטי</span>
              <Switch
                checked={watchdogEnabled}
                onCheckedChange={(v) => { setWatchdogEnabled(v); savePrefs.mutate({ pickup_watchdog_enabled: v }); }}
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>תזכורת לשליח אחרי (דקות מרגע שלקח את המשלוח)</Label>
                <Input
                  type="number" min={1} max={120} value={reminderMin}
                  disabled={!watchdogEnabled}
                  onChange={(e) => setReminderMin(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => savePrefs.mutate({ pickup_reminder_minutes: reminderMin })}
                />
              </div>
              <div>
                <Label>חיפוש שליח חדש אחרי (דקות מרגע התזכורת)</Label>
                <Input
                  type="number" min={1} max={120} value={redispatchMin}
                  disabled={!watchdogEnabled}
                  onChange={(e) => setRedispatchMin(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => savePrefs.mutate({ pickup_redispatch_minutes: redispatchMin })}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">השינויים נשמרים אוטומטית. בדיקה רצה כל דקה ברקע.</p>
          </CardContent>
        </Card>

        <Card id="biz-security" className="scroll-mt-24 rounded-2xl border-border shadow-card">
          <CardHeader className="flex flex-row items-center gap-2"><Shield className="size-4" /><CardTitle>שינוי סיסמה</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>סיסמה חדשה</Label><Input type="password" minLength={6} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
            <Button onClick={() => pwd.mutate()} disabled={!newPwd || pwd.isPending} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
              {pwd.isPending && <Loader2 className="size-4 animate-spin" />} עדכן סיסמה
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" /> משתמשים בצוות</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">בקרוב — אפשרות להוסיף משתמשים נוספים לעסק.</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle>חשבון</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={signOut} className="text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="size-4" /> יציאה מהחשבון
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </BusinessShell>
  );
}
