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
import { nestListMyFavorites, nestSetFavoriteCourier } from "@/lib/nest-domain";
import { ChevronLeft, Code2, Heart, Loader2, LogOut, Shield, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

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
  const [bizName, setBizName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [hours, setHours] = useState<HoursMap>(emptyHours());

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
      setBizName((me as any).business_name || me.name || "");
      setTaxId((me as any).business_tax_id || "");
      setPhone(me.phone || "");
      setEmail((me as any).email || "");
      setPickupAddress((me as any).pickup_address || (me as any).address || "");
      setPickupInstructions((me as any).pickup_instructions || (me as any).permanent_courier_notes || "");
      const niche = (me as any).niche_details as { operating_hours?: unknown } | null;
      setHours(parseHours(niche?.operating_hours));
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

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!me) return;
      await nestUpdateMyCustomer({
        business_name: bizName || null,
        business_tax_id: taxId || null,
        phone: phone || null,
        email: email || null,
        pickup_address: pickupAddress || null,
        pickup_instructions: pickupInstructions || null,
        niche_details: { operating_hours: hours },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-me"] }); toast.success("הפרטים נשמרו"); },
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
    enabled: !!me?.id,
    queryFn: nestListMyFavorites,
  });
  const removeFavorite = useMutation({
    mutationFn: async (courierId: string) => {
      await nestSetFavoriteCourier(courierId, null);
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
      <div className="flex flex-col gap-6 p-4 pb-24 lg:flex-row lg:p-8">
        <aside className="w-full shrink-0 space-y-4 lg:order-2 lg:w-[17.5rem]">
          <nav className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
            {[
              { href: "#biz-details", label: "פרטי עסק", active: true },
              { href: "/business/team", label: "משתמשים והרשאות", to: "/business/team" },
              { href: "#biz-notify", label: "התראות וסמס" },
              { href: "/business/integrations", label: "מפתחות ו-API", to: "/business/integrations" },
              { href: "#biz-security", label: "אבטחת חשבון" },
            ].map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to as never}
                  className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-medium text-text-subtle last:border-0 hover:bg-muted"
                >
                  {item.label}
                  <ChevronLeft className="size-4 text-text-muted" />
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted",
                    item.active ? "font-bold text-primary" : "font-medium text-text-subtle",
                  )}
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-panel">
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
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 lg:order-1">
        <section id="biz-details" className="scroll-mt-24 space-y-4 rounded-xl border border-border bg-surface p-6 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-text-strong">עדכון פרטי עסק</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="text-sm font-semibold text-destructive" disabled>
                הסר לוגו
              </button>
              <Button type="button" variant="outline" size="sm" className="text-primary" onClick={() => toast.info("העלאת לוגו תחזור לאחר Storage ב-Nest")}>
                <Upload className="size-4" /> העלה קובץ חדש
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-text-subtle">שם העסק</span>
              <Input value={bizName} onChange={(e) => setBizName(e.target.value)} className="h-11 rounded-lg" />
            </label>
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-text-subtle">מספר ח.פ. / עוסק מורשה</span>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="h-11 rounded-lg" />
            </label>
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-text-subtle">טלפון לתיאום משלוחים</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-lg" dir="ltr" />
            </label>
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-text-subtle">אימייל לקבלת קבלות</span>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg" dir="ltr" />
            </label>
            <label className="flex flex-col gap-1.5 text-right sm:col-span-2">
              <span className="text-xs font-medium text-text-subtle">כתובת העסק (איסוף משלוחים)</span>
              <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className="h-11 rounded-lg" />
            </label>
            <label className="flex flex-col gap-1.5 text-right sm:col-span-2">
              <span className="text-xs font-medium text-text-subtle">הוראות איסוף קבועות לשליח</span>
              <Textarea value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} className="min-h-24 rounded-lg" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-panel">
          <h2 className="mb-4 text-base font-bold text-text-strong">שעות פעילות למשלוחים</h2>
          <div className="divide-y divide-border">
            {WEEK_DAYS.map((day) => {
              const row = hours[day.key];
              return (
                <div key={day.key} className="flex items-center justify-between gap-3 py-3">
                  <span className={cn("rounded-pill px-2.5 py-1 text-[11px] font-bold", row.open ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text")}>
                    {row.open ? "פעיל" : "סגור"}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    {row.open ? (
                      <div className="flex items-center gap-2" dir="ltr">
                        <Input
                          type="time"
                          value={row.from}
                          onChange={(e) => setHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], from: e.target.value } }))}
                          className="h-9 w-[7.5rem] rounded-lg"
                        />
                        <span className="text-text-muted">–</span>
                        <Input
                          type="time"
                          value={row.to}
                          onChange={(e) => setHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], to: e.target.value } }))}
                          className="h-9 w-[7.5rem] rounded-lg"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                    <span className="w-24 text-sm font-semibold text-text-strong">{day.label}</span>
                    <Switch
                      checked={row.open}
                      onCheckedChange={(v) => setHours((prev) => ({ ...prev, [day.key]: { ...prev[day.key], open: v } }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <Card id="biz-account" className="scroll-mt-24 rounded-2xl border-border shadow-card lg:col-span-2">
          <CardHeader><CardTitle>סוג חשבון</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => changeMode("private")} className={`text-right rounded-xl border-2 p-4 transition ${accountMode === "private" ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong"}`}>
                <div className="font-extrabold text-slate-900">חשבון אישי</div>
                <div className="text-xs text-slate-500 mt-1">למשתמש פרטי — משלוח חבילה / מתנה / מסמך פעם בכמה זמן.</div>
              </button>
              <button onClick={() => changeMode("business")} className={`text-right rounded-xl border-2 p-4 transition ${accountMode === "business" ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong"}`}>
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
                הרשימה שלי ({favorites.data?.filter((f) => f.status !== "blocked").length ?? 0} מועדפים)
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
                          {f.status !== "blocked" && <span className="mr-2 text-xs text-rose-600">❤️ מועדף</span>}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {f.couriers?.vehicle_label || ""} {f.couriers?.base_city ? `· ${f.couriers.base_city}` : ""} {f.couriers?.whatsapp_phone ? `· ${f.couriers.whatsapp_phone}` : ""}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFavorite.mutate(f.courier_id)} className="text-slate-500 hover:text-red-600">
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
            <Button onClick={() => pwd.mutate()} disabled={!newPwd || pwd.isPending}>
              {pwd.isPending && <Loader2 className="size-4 animate-spin" />} עדכן סיסמה
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" /> משתמשים בצוות</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">ניהול הרשאות ומשתמשים נוספים לעסק.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/business/team">למסך הצוות</Link>
            </Button>
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex justify-center pb-3 lg:bottom-0 lg:pb-6">
        <div className="pointer-events-auto rounded-xl bg-sidebar px-4 py-3 shadow-panel">
          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="min-w-48 rounded-lg bg-primary text-primary-foreground">
            {saveProfile.isPending && <Loader2 className="size-4 animate-spin" />} שמור שינויים
          </Button>
        </div>
      </div>
    </BusinessShell>
  );
}

const WEEK_DAYS = [
  { key: "sun", label: "יום ראשון" },
  { key: "mon", label: "יום שני" },
  { key: "tue", label: "יום שלישי" },
  { key: "wed", label: "יום רביעי" },
  { key: "thu", label: "יום חמישי" },
  { key: "fri", label: "יום שישי" },
  { key: "sat", label: "יום שבת" },
] as const;

type HoursMap = Record<string, { open: boolean; from: string; to: string }>;

function emptyHours(): HoursMap {
  return Object.fromEntries(
    WEEK_DAYS.map((d) => [d.key, { open: false, from: "09:00", to: "23:00" }]),
  );
}

function parseHours(raw: unknown): HoursMap {
  const fallback = emptyHours();
  if (!raw) return fallback;
  if (typeof raw === "string") {
    try {
      return parseHours(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }
  if (typeof raw !== "object") return fallback;
  const next = { ...fallback };
  for (const day of WEEK_DAYS) {
    const row = (raw as Record<string, { open?: boolean; from?: string; to?: string }>)[day.key];
    if (!row) continue;
    next[day.key] = {
      open: Boolean(row.open),
      from: row.from || "09:00",
      to: row.to || "23:00",
    };
  }
  return next;
}
