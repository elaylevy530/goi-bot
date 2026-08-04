import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getWhatsAppProviderStatus,
  sendWhatsAppProviderTest,
} from "@/lib/whatsapp-provider.functions";
import { getGreenApiState, clearGreenApiQueue } from "@/lib/green-api-settings.functions";
import { getWaMaintenance, updateWaMaintenance } from "@/lib/wa-maintenance.functions";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Copy, MessageCircle, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DispatchGroupsCard } from "@/components/DispatchGroupsCard";

export const Route = createFileRoute("/_authenticated/whatsapp-provider")({
  head: () => ({ meta: [{ title: "ספק וואטסאפ — Goi" }] }),
  component: WhatsAppProviderPage,
});

const WEBHOOK_URL = "https://goi-bot.lovable.app/api/public/whatsapp-cloud-webhook";

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm">{label}</span>
      {ok ? (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
          <Check className="h-3 w-3" /> מוגדר
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <X className="h-3 w-3" /> חסר
        </Badge>
      )}
    </div>
  );
}

function WhatsAppProviderPage() {
  const getStatus = useServerFn(getWhatsAppProviderStatus);
  const testSend = useServerFn(sendWhatsAppProviderTest);
  const getGreen = useServerFn(getGreenApiState);
  const clearQueue = useServerFn(clearGreenApiQueue);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-provider-status"],
    queryFn: () => getStatus(),
  });
  const { data: green, refetch: refetchGreen } = useQuery({
    queryKey: ["green-api-state"],
    queryFn: () => getGreen(),
    refetchInterval: 10000,
  });
  const clearMutation = useMutation({
    mutationFn: () => clearQueue(),
    onSuccess: () => {
      toast.success("התור נוקה");
      refetchGreen();
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בניקוי התור"),
  });

  const getMaint = useServerFn(getWaMaintenance);
  const saveMaint = useServerFn(updateWaMaintenance);
  const { data: maint, refetch: refetchMaint } = useQuery({
    queryKey: ["wa-maintenance"],
    queryFn: () => getMaint(),
  });
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [allowText, setAllowText] = useState("");
  useEffect(() => {
    if (maint) {
      setMaintEnabled(maint.enabled);
      setAllowText((maint.allowlist ?? []).join("\n"));
    }
  }, [maint]);
  const saveMaintMutation = useMutation({
    mutationFn: () =>
      saveMaint({
        data: {
          enabled: maintEnabled,
          allowlist: allowText
            .split(/[\s,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("הגדרות מצב תחזוקה נשמרו");
      refetchMaint();
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשמירה"),
  });

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("בדיקה מ-GOI ✅");

  const sendMutation = useMutation({
    mutationFn: () => testSend({ data: { phone: testPhone, message: testMessage } }),
    onSuccess: (r) => toast.success(`נשלח דרך ${r.provider}`),
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשליחה"),
  });

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("הועתק");
  };

  return (
    <AdminLayout
      title="ספק וואטסאפ"
      subtitle="הכנה לחיבור WhatsApp Cloud API הרשמי של Meta — Green API נשאר כברירת מחדל עד שתעבירו את הדגל."
    >
      <div className="space-y-6 max-w-4xl">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> ספק פעיל
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">טוען…</p>
            ) : data ? (
              <div className="flex items-center gap-3">
                <Badge className={data.active === "cloud" ? "bg-blue-600" : "bg-emerald-600"}>
                  {data.active === "cloud" ? "Meta WhatsApp Cloud (רשמי)" : "Green API (לא רשמי)"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  רענן
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className={maintEnabled ? "border-amber-500 bg-amber-50/40" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${maintEnabled ? "text-amber-600" : ""}`} />
              מצב תחזוקה / בדיקות
              {maintEnabled && <Badge className="bg-amber-500">פעיל</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm text-muted-foreground leading-relaxed">
                כשמופעל — <b>שום הודעת וואטסאפ לא תצא</b> מהמערכת חוץ מאשר למספרים שברשימת ההיתר למטה.
                שימושי לבדיקות לפני העברה ל-API רשמי.
              </div>
              <Switch
                checked={maintEnabled}
                onCheckedChange={setMaintEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label>מספרים מורשים (אחד בשורה, פורמט ישראלי)</Label>
              <Textarea
                dir="ltr"
                rows={4}
                placeholder={"0509810022\n0521234567"}
                value={allowText}
                onChange={(e) => setAllowText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                הוסף את המספר שלך + מספר השליח לבדיקה. רק הם יקבלו הודעות.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMaintMutation.mutate()}
                disabled={saveMaintMutation.isPending}
              >
                {saveMaintMutation.isPending ? "שומר…" : "שמור הגדרות"}
              </Button>
              {maint?.updatedAt && (
                <span className="text-xs text-muted-foreground self-center">
                  עודכן: {new Date(maint.updatedAt).toLocaleString("he-IL")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Green API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusRow label="GREEN_API_INSTANCE_ID + TOKEN" ok={!!data?.green.configured} />
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-sm">סטטוס מופע</span>
                <Badge
                  className={
                    green?.stateInstance === "authorized"
                      ? "bg-emerald-600"
                      : "bg-amber-500"
                  }
                >
                  {green?.stateInstance ?? "—"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm">מספר מחובר</span>
                <code className="text-xs" dir="ltr">{green?.wid || "—"}</code>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  הודעות בתור
                </div>
                <Badge variant={green && green.queueSize > 0 ? "destructive" : "outline"}>
                  {green?.queueSize ?? 0}
                </Badge>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  if (confirm("לנקות את כל ההודעות הממתינות בתור של Green API? פעולה בלתי הפיכה.")) {
                    clearMutation.mutate();
                  }
                }}
                disabled={clearMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearMutation.isPending ? "מנקה…" : "נקה תור הודעות"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meta WhatsApp Cloud (רשמי)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatusRow label="WHATSAPP_CLOUD_PHONE_NUMBER_ID + ACCESS_TOKEN" ok={!!data?.cloud.configured} />
              <StatusRow label="WHATSAPP_CLOUD_VERIFY_TOKEN" ok={!!data?.cloud.hasVerifyToken} />
              <StatusRow label="WHATSAPP_CLOUD_APP_SECRET (חתימת webhook)" ok={!!data?.cloud.hasAppSecret} />
              <div className="text-xs text-muted-foreground pt-2">
                גרסת API: {data?.cloud.apiVersion}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">חיבור Meta — צ׳קליסט</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal pr-5 space-y-2">
              <li>צור Meta App מסוג Business ב-developers.facebook.com והוסף מוצר WhatsApp.</li>
              <li>שייך מספר WhatsApp Business (דרך BSP כמו 360dialog/Twilio או ישירות).</li>
              <li>הפק System User Access Token קבוע עם הרשאות whatsapp_business_messaging + management.</li>
              <li>
                בחלון Configuration → Webhooks הזן:
                <div className="mt-2 flex gap-2 items-center bg-muted rounded p-2">
                  <code className="text-xs flex-1 break-all">{WEBHOOK_URL}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                והירשם לפחות לאירוע <code>messages</code>.
              </li>
              <li>
                הגדר את הסודות הבאים (Project Secrets):
                <ul className="list-disc pr-5 mt-1 space-y-0.5 text-xs">
                  <li><code>WHATSAPP_CLOUD_PHONE_NUMBER_ID</code></li>
                  <li><code>WHATSAPP_CLOUD_ACCESS_TOKEN</code></li>
                  <li><code>WHATSAPP_CLOUD_VERIFY_TOKEN</code> (זהה למה שתזין ב-Meta)</li>
                  <li><code>WHATSAPP_CLOUD_APP_SECRET</code> (App → Settings → Basic)</li>
                  <li><code>WHATSAPP_PROVIDER=cloud</code> כדי להפעיל את הספק הרשמי</li>
                </ul>
              </li>
              <li>אשר תבניות הודעה (templates) ב-WhatsApp Manager — חובה לפניות יזומות מחוץ ל-24ש׳.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">בדיקת שליחה (דרך הספק הפעיל)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>מספר טלפון</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="05X-XXXXXXX"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label>הודעה</Label>
                <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
              </div>
            </div>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!testPhone || sendMutation.isPending}
            >
              {sendMutation.isPending ? "שולח…" : "שלח בדיקה"}
            </Button>
          </CardContent>
        </Card>

        <DispatchGroupsCard />
      </div>
    </AdminLayout>
  );
}
