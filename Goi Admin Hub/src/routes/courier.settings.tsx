import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Loader2, LogOut, Bell, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PushEnableRow } from "@/components/PushEnableRow";
import { pushSupported } from "@/lib/push/subscribe";


export const Route = createFileRoute("/courier/settings")({
  head: () => ({ meta: [{ title: "הגדרות — Goi" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [waOptIn, setWaOptIn] = useState(true);

  const changePwd = useMutation({
    mutationFn: async () => {
      if (pwd.length < 6) throw new Error("סיסמה חייבת לפחות 6 תווים");
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("הסיסמה עודכנה ✓"); setPwd(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <CourierShell title="הגדרות" subtitle="ניהול חשבון והעדפות">
      <div className="w-full min-w-0 grid lg:grid-cols-2 gap-4">
        <Card className="min-w-0 rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-bold text-end">שינוי סיסמה</h2>
            <div><Label className="text-end block">סיסמה חדשה</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} dir="ltr" minLength={6} /></div>
            <Button className="w-full bg-[#35AD29] hover:bg-[#2d9623] text-white" onClick={() => changePwd.mutate()} disabled={changePwd.isPending || pwd.length < 6}>
              {changePwd.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} עדכן סיסמה
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-bold text-end">העדפות התראות</h2>
            {me?.id && pushSupported() && <PushEnableRow courierId={me.id} />}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
              <Switch checked={notifPush} onCheckedChange={setNotifPush} />
              <div className="text-end flex items-center gap-2"><Bell className="size-4 text-slate-500" /><span className="text-sm">התראות בדפדפן</span></div>
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
              <Switch checked={notifSms} onCheckedChange={setNotifSms} />
              <div className="text-end flex items-center gap-2"><MessageCircle className="size-4 text-slate-500" /><span className="text-sm">התראות SMS</span></div>
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
              <Switch checked={waOptIn} onCheckedChange={setWaOptIn} />
              <div className="text-end flex items-center gap-2"><MessageCircle className="size-4 text-emerald-600" /><span className="text-sm">קבלת הצעות בוואטסאפ</span></div>
            </div>
            <p className="text-xs text-slate-500 text-end">ההעדפות נשמרות מקומית בדפדפן.</p>
          </CardContent>

        </Card>

        <Card className="min-w-0 rounded-2xl border-slate-200 shadow-sm lg:col-span-2">
          <CardContent className="p-5 flex items-center justify-between">
            <Button variant="outline" onClick={signOut} className="border-red-200 text-red-600 hover:bg-red-50">
              <LogOut className="size-4" /> יציאה
            </Button>
            <div className="text-end">
              <div className="font-semibold">{me?.full_name}</div>
              <div className="text-xs text-slate-500 ltr:text-left" dir="ltr">{me?.whatsapp_phone}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CourierShell>
  );
}
