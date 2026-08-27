import { createFileRoute } from "@tanstack/react-router";
import { CourierShell } from "@/components/CourierShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NestBackendStatusCard } from "@/components/NestBackendStatusCard";
import { getGreenApiSettings, setGreenApiSettings, GREEN_API_TOGGLE_KEYS } from "@/lib/green-api-settings.functions";
import { setPlatformSettingFn } from "@/lib/platform-settings.functions";
import { nestGetPlatformSetting } from "@/lib/nest-platform-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/settings")({
  head: () => ({ meta: [{ title: "הגדרות — Goi" }] }),
  component: SettingsPage,
});

const TOGGLE_LABELS: Record<string, string> = {
  incomingWebhook: "הודעות נכנסות (incomingWebhook)",
  outgoingWebhook: "הודעות יוצאות (outgoingWebhook)",
  outgoingMessageWebhook: "הודעות יוצאות מהטלפון (outgoingMessageWebhook)",
  outgoingAPIMessageWebhook: "הודעות שנשלחו דרך API (outgoingAPIMessageWebhook)",
  stateWebhook: "סטטוס מופע (stateWebhook)",
  deviceWebhook: "סוללה/מכשיר (deviceWebhook)",
  statusInstanceWebhook: "מצב חיבור Instance (statusInstanceWebhook)",
  pollMessageWebhook: "סקרים (pollMessageWebhook)",
  incomingBlockWebhook: "חסימות נכנסות (incomingBlockWebhook)",
  incomingCallWebhook: "שיחות נכנסות (incomingCallWebhook)",
  editedMessageWebhook: "הודעות שנערכו (editedMessageWebhook)",
  deletedMessageWebhook: "הודעות שנמחקו (deletedMessageWebhook)",
};

const DEFAULT_WEBHOOK_URL = "https://goi-bot.lovable.app/api/public/green-webhook";

function SettingsPage() {
  const qc = useQueryClient();
  const getSettings = useServerFn(getGreenApiSettings);
  const setSettings = useServerFn(setGreenApiSettings);

  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [toggles, setToggles] = useState<Record<string, "yes" | "no">>({});

  const { data: current, isLoading, isFetching } = useQuery({
    queryKey: ["green-api-settings"],
    queryFn: () => getSettings({}),
  });

  useEffect(() => {
    if (!current) return;
    setWebhookUrl(current.webhookUrl ?? DEFAULT_WEBHOOK_URL);
    setWebhookToken(current.webhookUrlToken ?? "");
    const next: Record<string, "yes" | "no"> = {};
    for (const k of GREEN_API_TOGGLE_KEYS) {
      next[k] = current[k] === "yes" ? "yes" : "no";
    }
    setToggles(next);
  }, [current]);

  const save = useMutation({
    mutationFn: () => setSettings({ data: { webhookUrl, webhookUrlToken: webhookToken, toggles } }),
    onSuccess: () => {
      toast.success("ההגדרות נשמרו ב-Green API ✓");
      qc.invalidateQueries({ queryKey: ["green-api-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <CourierShell title="הגדרות" subtitle="הגדרות כלליות של המערכת">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        <FeatureFlagsCard />
        <NestBackendStatusCard />
        <Card>
          <CardHeader><CardTitle>פרטי חברה</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>שם המערכת</Label><Input defaultValue="Goi" /></div>
            <div><Label>אימייל תמיכה</Label><Input defaultValue="support@goi.co.il" /></div>
            <div><Label>טלפון מערכת</Label><Input placeholder="+972-50-..." /></div>
            <Button>שמור</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Bot className="size-4 text-primary" /> הגדרות Green API</span>
              <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["green-api-settings"] })} disabled={isFetching}>
                <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> רענן
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              שינוי כאן נשלח ישירות ל-Green API ומחליף את ההגדרות במופע (Instance) המחובר.
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> טוען הגדרות נוכחיות...</div>
            ) : (
              <>
                <div>
                  <Label>Webhook URL</Label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} dir="ltr" placeholder={DEFAULT_WEBHOOK_URL} />
                  <div className="text-xs text-slate-500 mt-1">ברירת מחדל: {DEFAULT_WEBHOOK_URL}</div>
                </div>
                <div>
                  <Label>Webhook Token (אופציונלי)</Label>
                  <Input value={webhookToken} onChange={(e) => setWebhookToken(e.target.value)} dir="ltr" placeholder="לרוב ריק" />
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-sm font-semibold">טוגלים</div>
                  {GREEN_API_TOGGLE_KEYS.map((k) => (
                    <div key={k} className="flex items-center justify-between p-2.5 border rounded-md">
                      <Switch
                        checked={toggles[k] === "yes"}
                        onCheckedChange={(v) => setToggles((t) => ({ ...t, [k]: v ? "yes" : "no" }))}
                      />
                      <div className="text-end">
                        <div className="font-medium text-sm">{TOGGLE_LABELS[k] ?? k}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
                  {save.isPending && <Loader2 className="size-4 animate-spin" />} שמור ל-Green API
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </CourierShell>
  );
}

const FEATURE_FLAGS: { key: string; title: string; desc: string }[] = [
  { key: "send_enabled",  title: "אריח 'משלוח'",   desc: "כשכבוי — האריח לא מוצג ללקוחות בבחירת סוג ההזמנה." },
  { key: "bring_enabled", title: "אריח 'תביאו לי'", desc: "כשכבוי — האריח לא מוצג ללקוחות בבחירת סוג ההזמנה." },
  { key: "munch_enabled", title: "מצב מאנצ׳ (Munch)", desc: "כשכבוי — לקוחות רואים תווית 'בקרוב' ומקבלים הודעת הרצה במקום פתיחת השירות." },
];

function FeatureFlagsCard() {
  const qc = useQueryClient();
  const savePlatform = useServerFn(setPlatformSettingFn);

  const { data: flags, isLoading } = useQuery({
    queryKey: ["platform-settings", "feature-flags"],
    queryFn: async () => {
      const keys = FEATURE_FLAGS.map((f) => f.key);
      const rows = await Promise.all(keys.map((key) => nestGetPlatformSetting(key)));
      const map: Record<string, boolean> = {};
      FEATURE_FLAGS.forEach((f, i) => {
        const row = rows[i];
        map[f.key] = row ? row.value === true || row.value === "true" : true;
      });
      return map;
    },
  });

  const toggle = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) =>
      savePlatform({ data: { key, value } }),
    onSuccess: () => {
      toast.success("ההגדרה נשמרה ✓");
      qc.invalidateQueries({ queryKey: ["platform-settings", "feature-flags"] });
      qc.invalidateQueries({ queryKey: ["platform-settings", "munch_enabled"] });
      qc.invalidateQueries({ queryKey: ["platform-settings", "send_enabled"] });
      qc.invalidateQueries({ queryKey: ["platform-settings", "bring_enabled"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>פיצ׳רים / Feature Flags</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {FEATURE_FLAGS.map((f) => (
          <div key={f.key} className="flex items-center justify-between p-3 border rounded-md">
            <Switch
              checked={!!flags?.[f.key]}
              disabled={isLoading || toggle.isPending}
              onCheckedChange={(v) => toggle.mutate({ key: f.key, value: v })}
            />
            <div className="text-end">
              <div className="font-semibold text-sm">{f.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
