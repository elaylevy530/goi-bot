import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import {
  nestGetMyIntegration, nestUpdateMyIntegration, nestListMyIntegrationLogs,
} from "@/lib/nest-domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, CheckCircle2, AlertCircle, Link2, Code2, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/integrations")({
  component: BusinessIntegrationsPage,
});

function BusinessIntegrationsPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const businessId = me?.id;

  const { data: integration, isLoading } = useQuery({
    queryKey: ["business-integration", businessId],
    enabled: !!businessId,
    queryFn: () => nestGetMyIntegration(),
  });

  const { data: logs } = useQuery({
    queryKey: ["business-integration-logs", businessId],
    enabled: !!businessId,
    refetchInterval: 15_000,
    queryFn: () => nestListMyIntegrationLogs(),
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<{ enabled: boolean; auto_mode: boolean; default_pricing_type: string; default_fixed_price: number | null }>) => {
      await nestUpdateMyIntegration(patch);
    },
    onSuccess: () => {
      toast.success("נשמר");
      qc.invalidateQueries({ queryKey: ["business-integration", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotateSecret = useMutation({
    mutationFn: async () => {
      // Generate a hex secret client-side (48 chars)
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const secret = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      await nestUpdateMyIntegration({ webhook_secret: secret });
    },
    onSuccess: () => {
      toast.success("הסוד הוחלף");
      qc.invalidateQueries({ queryKey: ["business-integration", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/intake/${integration!.integration_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "לקוח בדיקה",
          customer_phone: "0500000000",
          dropoff_address: "דיזנגוף 50, תל אביב",
          dropoff_city: "תל אביב",
          items: "הזמנת בדיקה מהפאנל",
          order_total: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "שגיאה");
      return json;
    },
    onSuccess: (j) => {
      toast.success(`הזמנת בדיקה נוצרה: ${j.job_number}`);
      qc.invalidateQueries({ queryKey: ["business-integration-logs", businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !integration) {
    return (
      <BusinessShell title="חיבור אתר / הזמנות אוטומטיות">
        <div className="p-8 text-center text-slate-500">טוען…</div>
      </BusinessShell>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const intakeUrl = `${baseUrl}/api/public/intake/${integration.integration_token}`;
  const quickOrderUrl = `${baseUrl}/order/${integration.integration_token}`;

  const curlExample = `curl -X POST "${intakeUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "ישראל ישראלי",
    "customer_phone": "0501234567",
    "dropoff_address": "הרצל 10, תל אביב",
    "order_total": 120,
    "items": "פיצה משפחתית x1"
  }'`;

  const widgetSnippet = `<a href="${quickOrderUrl}" target="_blank"
   style="display:inline-block;background:#35AD29;color:#fff;
          padding:12px 24px;border-radius:8px;font-weight:bold;
          text-decoration:none">
  הזמן משלוח
</a>`;

  return (
    <BusinessShell
      title="חיבור אתר / הזמנות אוטומטיות"
      subtitle="חבר את האתר שלך וקבל הזמנות ישירות לפאנל — חיפוש שליח אוטומטי"
    >
      <div className="grid gap-6">
        {/* Status + Auto mode */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {integration.enabled ? (
                <CheckCircle2 className="size-6 text-[#35AD29]" />
              ) : (
                <AlertCircle className="size-6 text-amber-500" />
              )}
              <div>
                <div className="font-bold text-slate-900">
                  {integration.enabled ? "החיבור פעיל" : "החיבור כבוי"}
                </div>
                <div className="text-sm text-slate-500">
                  {integration.auto_mode
                    ? "הזמנות חדשות נשלחות אוטומטית לחיפוש שליח"
                    : "הזמנות חדשות נשמרות כטיוטה ודורשות אישור ידני"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="enabled" className="text-sm">פעיל</Label>
                <Switch
                  id="enabled"
                  checked={integration.enabled}
                  onCheckedChange={(v) => update.mutate({ enabled: v })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="auto" className="text-sm">מצב אוטומטי</Label>
                <Switch
                  id="auto"
                  checked={integration.auto_mode}
                  onCheckedChange={(v) => update.mutate({ auto_mode: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>הגדרות ברירת מחדל לכל הזמנה נכנסת</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>סוג תמחור</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update.mutate({ default_pricing_type: "fixed" })}
                  className={`flex-1 rounded-lg border-2 p-3 text-sm font-bold ${
                    integration.default_pricing_type === "fixed"
                      ? "border-[#35AD29] bg-emerald-50 text-[#35AD29]"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  מחיר קבוע
                </button>
                <button
                  type="button"
                  onClick={() => update.mutate({ default_pricing_type: "quote_request" })}
                  className={`flex-1 rounded-lg border-2 p-3 text-sm font-bold ${
                    integration.default_pricing_type === "quote_request"
                      ? "border-[#35AD29] bg-emerald-50 text-[#35AD29]"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  מכרז (הצעות)
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>מחיר קבוע ברירת מחדל (₪)</Label>
              <PriceInput
                value={integration.default_fixed_price ?? ""}
                onSave={(v) => update.mutate({ default_fixed_price: v })}
                disabled={integration.default_pricing_type !== "fixed"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs with integration methods */}
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid grid-cols-3 max-w-xl">
            <TabsTrigger value="link"><Link2 className="size-4 ml-1" />קישור מהיר</TabsTrigger>
            <TabsTrigger value="widget"><Code2 className="size-4 ml-1" />כפתור לאתר</TabsTrigger>
            <TabsTrigger value="api"><Send className="size-4 ml-1" />API למתכנתים</TabsTrigger>
          </TabsList>

          <TabsContent value="link">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>קישור הזמנה מהיר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  הדרך הכי פשוטה. שלח את הקישור הזה ללקוחות, או שים אותו ככפתור באתר/בוואטסאפ.
                  הלקוח ממלא טופס קצר וההזמנה נכנסת אוטומטית עם כתובת האיסוף הקבועה שלך.
                </p>
                <CopyRow label="קישור ההזמנה" value={quickOrderUrl} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="widget">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>כפתור מוכן להדבקה באתר</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  העתק את הקוד הבא והדבק בכל מקום באתר שלך. ייווצר כפתור ירוק שלוקח את הלקוח לטופס ההזמנה.
                </p>
                <CodeBlock code={widgetSnippet} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Webhook / API למתכנתים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CopyRow label="כתובת ה-Endpoint" value={intakeUrl} />
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>סוד ל-HMAC (אופציונלי, header x-signature)</Label>
                    <Button size="sm" variant="ghost" onClick={() => rotateSecret.mutate()}>
                      <RefreshCw className="size-3 ml-1" /> החלף סוד
                    </Button>
                  </div>
                  <CopyRow value={integration.webhook_secret} mono />
                </div>
                <div>
                  <Label className="text-sm mb-2 block">דוגמת curl</Label>
                  <CodeBlock code={curlExample} />
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">שדות:</div>
                  <div><code>customer_name</code> — שם הנמען (חובה)</div>
                  <div><code>customer_phone</code> — טלפון הנמען (חובה)</div>
                  <div><code>dropoff_address</code> — כתובת המסירה (חובה)</div>
                  <div><code>dropoff_city</code>, <code>dropoff_notes</code>, <code>items</code>, <code>order_total</code>, <code>external_ref</code> — אופציונלי</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test button */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-bold text-slate-900">בדיקה מהירה</div>
              <div className="text-sm text-slate-500">שלח הזמנת דמה כדי לוודא שהכל עובד</div>
            </div>
            <Button
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending}
              className="bg-[#35AD29] hover:bg-[#2E9624]"
            >
              <Send className="size-4 ml-2" />
              {sendTest.isPending ? "שולח…" : "שלח הזמנת בדיקה"}
            </Button>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>הקריאות האחרונות (20 אחרונות)</CardTitle>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">
                עדיין לא נכנסו הזמנות דרך החיבור
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {log.status === "ok" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">הצליח</Badge>
                      ) : (
                        <Badge variant="destructive">שגיאה</Badge>
                      )}
                      <div className="text-sm text-slate-700 truncate">
                        {log.error || log.payload?.customer_name || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 shrink-0">
                      {new Date(log.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessShell>
  );
}

function CopyRow({ label, value, mono }: { label?: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-2">
      {label && <Label className="text-sm">{label}</Label>}
      <div className="flex gap-2">
        <Input value={value} readOnly className={mono ? "font-mono text-xs" : "text-sm"} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("הועתק");
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-slate-950 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto" dir="ltr">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 left-2"
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("הקוד הועתק");
        }}
      >
        <Copy className="size-3 ml-1" /> העתק
      </Button>
    </div>
  );
}

function PriceInput({
  value,
  onSave,
  disabled,
}: {
  value: number | string;
  onSave: (v: number | null) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState(String(value ?? ""));
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={disabled}
        placeholder="₪"
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onSave(v ? Number(v) : null)}
      >
        שמור
      </Button>
    </div>
  );
}
