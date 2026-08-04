import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send, Trash2, Loader2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courier-notifications")({
  head: () => ({ meta: [{ title: "התראות לשליחים — Goi" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<"all" | "single">("all");
  const [courierId, setCourierId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const { data: couriers = [] } = useQuery({
    queryKey: ["all-couriers-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("couriers")
        .select("id, full_name, whatsapp_phone, courier_status")
        .order("full_name", { ascending: true });
      return data ?? [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["admin-sent-notifs"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_admin_notifications")
        .select("id, audience, title, body, link_url, courier_id, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("חובה כותרת");
      if (audience === "single" && !courierId) throw new Error("בחר שליח");
      const { data: u } = await supabase.auth.getUser();
      const row = {
        audience,
        title: title.trim(),
        body: body.trim() || null,
        link_url: linkUrl.trim() || null,
        courier_id: audience === "single" ? courierId : null,
        sent_by: u?.user?.id ?? null,
      };
      const { error } = await supabase.from("courier_admin_notifications").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ההודעה נשלחה");
      setTitle(""); setBody(""); setLinkUrl("");
      qc.invalidateQueries({ queryKey: ["admin-sent-notifs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשליחה"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_admin_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["admin-sent-notifs"] });
    },
  });

  const nameOf = (id: string | null) =>
    id ? (couriers.find((c: any) => c.id === id)?.full_name ?? "—") : "כל השליחים";

  return (
    <AdminLayout title="התראות לשליחים">
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="size-6" /> התראות לשליחים</h1>
          <Link to="/couriers-admin" className="text-sm text-emerald-700 underline">לרשימת השליחים</Link>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>קהל יעד</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><Users className="inline size-4 ml-1" /> כל השליחים</SelectItem>
                    <SelectItem value="single">שליח יחיד</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {audience === "single" && (
                <div>
                  <Label>שליח</Label>
                  <Select value={courierId} onValueChange={setCourierId}>
                    <SelectTrigger><SelectValue placeholder="בחר שליח" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {couriers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.whatsapp_phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>כותרת</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: עדכון מערכת חשוב" />
            </div>
            <div>
              <Label>תוכן ההודעה</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="פירוט ההודעה לשליחים" />
            </div>
            <div>
              <Label>קישור (אופציונלי)</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <Button onClick={() => send.mutate()} disabled={send.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {send.isPending ? <Loader2 className="size-4 ml-2 animate-spin" /> : <Send className="size-4 ml-2" />}
              שלח התראה
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b font-semibold">היסטוריית התראות</div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500">לא נשלחו התראות עדיין</div>
            ) : (
              <ul className="divide-y">
                {items.map((n: any) => (
                  <li key={n.id} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">{n.title}</div>
                        <Badge variant={n.audience === "all" ? "default" : "secondary"} className={n.audience === "all" ? "bg-emerald-600" : ""}>
                          {n.audience === "all" ? "כל השליחים" : nameOf(n.courier_id)}
                        </Badge>
                        {n.read_at && <Badge variant="outline">נקרא</Badge>}
                      </div>
                      {n.body && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</div>}
                      <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString("he-IL")}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(n.id)}>
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
