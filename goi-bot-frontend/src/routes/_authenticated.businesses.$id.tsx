import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nestGetCustomer, nestUpdateCustomer } from "@/lib/nest-accounts";
import { nestListCustomerJobs } from "@/lib/nest-domain";
import { ViewPanelButton } from "@/components/ViewPanelButton";
import {
  ArrowRight, MessageCircle, Save, Loader2, CheckCircle2, Clock, CreditCard, MapPin, Phone, Mail, Building2, Briefcase, Wallet, Copy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/businesses/$id")({
  head: () => ({ meta: [{ title: "פרופיל עסק — Goi" }] }),
  component: BusinessProfile,
});

const NICHE_LABELS: Record<string, string> = {
  restaurant: "מסעדה / אוכל / בית קפה",
  local_business: "עסק מקומי",
  manual_dispatch: "שליחויות ידניות",
  online_store: "חנות אונליין",
  pharmacy_clinic: "בית מרקחת / מרפאה",
};

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium break-words">{value || "—"}</div>
    </div>
  );
}

function BusinessProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: c, isLoading } = useQuery({
    queryKey: ["admin-business", id],
    queryFn: async () => {
      const data = await nestGetCustomer(id);
      if (!data) throw notFound();
      setForm((prev: any) => prev ?? data);
      return data;
    },
  });

  const { data: jobStats } = useQuery({
    queryKey: ["admin-business-jobs", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const data = await nestListCustomerJobs(id);
      const total = data?.length ?? 0;
      const completed = data?.filter((j) => j.status === "הושלמה").length ?? 0;
      const open = data?.filter((j) => !["הושלמה", "בוטלה"].includes(j.status as string)).length ?? 0;
      const revenue = (data ?? []).reduce((s, j) => s + Number(j.final_price ?? 0), 0);
      return { total, completed, open, revenue, recent: (data ?? []).slice(0, 10) };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const patch = {
        name: form.name, business_name: form.business_name, phone: form.phone, email: form.email,
        city: form.city, address: form.address, business_niche: form.business_niche,
        niche_details: form.niche_details, pickup_contact_name: form.pickup_contact_name,
        pickup_contact_phone: form.pickup_contact_phone, pickup_address: form.pickup_address,
        website_url: form.website_url, business_tax_id: form.business_tax_id,
        status: form.status, notes: form.notes,
      };
      await nestUpdateCustomer(id, patch);
    },
    onSuccess: () => {
      toast.success("נשמר");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["admin-business", id] });
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !c || !form) {
    return <AdminLayout title="טוען..."><div className="p-8 text-center"><Loader2 className="size-6 animate-spin inline" /></div></AdminLayout>;
  }

  const phoneDigits = String(c.phone ?? "").replace(/\D/g, "").replace(/^0/, "972");
  const waLink = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";

  return (
    <AdminLayout
      title={c.business_name || c.name || "עסק"}
      subtitle={c.business_name ? c.name : undefined}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/businesses" })}>
            <ArrowRight className="size-4" /> חזרה
          </Button>
          <ViewPanelButton panel="business" entityId={id} label="צפה בפאנל" />
          {phoneDigits && (
            <Button variant="outline" onClick={() => window.open(waLink, "_blank")}>
              <MessageCircle className="size-4" /> וואטסאפ
            </Button>
          )}
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => { setForm(c); setEditing(false); }}>בטל</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} שמור
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>ערוך</Button>
          )}
        </div>
      }
    >
      {/* Status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">סטטוס</div>
          <Badge className="mt-1" variant="outline">{c.status ?? "—"}</Badge>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">הסכם שירות</div>
          {c.signed_agreement_at ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">
              <CheckCircle2 className="size-3 me-1" /> חתום {c.signed_agreement_version ? `v${c.signed_agreement_version}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mt-1">
              <Clock className="size-3 me-1" /> ממתין
            </Badge>
          )}
          {c.signed_agreement_at && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {c.signed_agreement_name} · {new Date(c.signed_agreement_at).toLocaleDateString("he-IL")}
            </div>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">אמצעי תשלום</div>
          {c.payment_method_on_file ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mt-1">
              <CreditCard className="size-3 me-1" />
              {c.payment_method_brand ?? "כרטיס"} {c.payment_method_last4 ? `••${c.payment_method_last4}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 mt-1">חסר</Badge>
          )}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">סה״כ משלוחים</div>
          <div className="text-2xl font-bold">{jobStats?.total ?? 0}</div>
          <div className="text-[11px] text-muted-foreground">
            פתוחים: {jobStats?.open ?? 0} · הושלמו: {jobStats?.completed ?? 0}
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">פרטי עסק</TabsTrigger>
          <TabsTrigger value="pickup">איסוף וכתובות</TabsTrigger>
          <TabsTrigger value="billing">חיוב והסכם</TabsTrigger>
          <TabsTrigger value="jobs">משלוחים אחרונים</TabsTrigger>
          <TabsTrigger value="notes">הערות</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> פרטי עסק</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editing ? (
              <>
                <div><Label>שם העסק</Label><Input value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
                <div><Label>איש קשר</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>טלפון</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>אימייל</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>עיר</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>כתובת</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div>
                  <Label>נישה</Label>
                  <Select value={form.business_niche ?? ""} onValueChange={(v) => setForm({ ...form, business_niche: v })}>
                    <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(NICHE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>פירוט נישה</Label><Input value={form.niche_details ?? ""} onChange={(e) => setForm({ ...form, niche_details: e.target.value })} /></div>
                <div><Label>אתר</Label><Input value={form.website_url ?? ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
                <div><Label>ח.פ / עוסק</Label><Input value={form.business_tax_id ?? ""} onChange={(e) => setForm({ ...form, business_tax_id: e.target.value })} /></div>
                <div>
                  <Label>סטטוס</Label>
                  <Select value={form.status ?? ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["חדש", "פעיל", "מושהה", "לא פעיל"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <Detail label="שם העסק" value={c.business_name} />
                <Detail label="איש קשר" value={c.name} />
                <Detail label="טלפון" value={<span className="font-mono flex items-center gap-2"><Phone className="size-3" />{c.phone}{c.phone && <button onClick={() => { navigator.clipboard.writeText(c.phone); toast.success("הועתק"); }}><Copy className="size-3" /></button>}</span>} />
                <Detail label="אימייל" value={c.email && <span className="flex items-center gap-2"><Mail className="size-3" />{c.email}</span>} />
                <Detail label="עיר" value={c.city} />
                <Detail label="כתובת" value={c.address} />
                <Detail label="נישה" value={NICHE_LABELS[c.business_niche] ?? c.business_niche} />
                <Detail label="פירוט נישה" value={typeof c.niche_details === "string" ? c.niche_details : c.niche_details ? JSON.stringify(c.niche_details) : ""} />
                <Detail label="אתר" value={c.website_url} />
                <Detail label="ח.פ / עוסק" value={c.business_tax_id} />
                <Detail label="נרשם" value={new Date(c.created_at).toLocaleString("he-IL")} />
                <Detail label="ערים לשירות" value={Array.isArray(c.service_areas) ? (c.service_areas as any[]).join(", ") : String(c.service_areas ?? "")} />
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pickup">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4" /> איסוף קבוע</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editing ? (
              <>
                <div><Label>איש קשר לאיסוף</Label><Input value={form.pickup_contact_name ?? ""} onChange={(e) => setForm({ ...form, pickup_contact_name: e.target.value })} /></div>
                <div><Label>טלפון איש קשר</Label><Input value={form.pickup_contact_phone ?? ""} onChange={(e) => setForm({ ...form, pickup_contact_phone: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>כתובת איסוף</Label><Input value={form.pickup_address ?? ""} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>
              </>
            ) : (
              <>
                <Detail label="איש קשר לאיסוף" value={c.pickup_contact_name} />
                <Detail label="טלפון איש קשר" value={c.pickup_contact_phone} />
                <Detail label="כתובת איסוף" value={c.pickup_address} />
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4" /> חיוב והסכם</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Detail label="אמצעי תשלום" value={c.payment_method_on_file ? `${c.payment_method_brand ?? "כרטיס"} ••${c.payment_method_last4 ?? "----"}` : "לא קיים"} />
            <Detail label="ספק תשלום" value={c.payment_provider} />
            <Detail label="עודכן" value={c.payment_method_added_at && new Date(c.payment_method_added_at).toLocaleString("he-IL")} />
            <Detail label="מחזור חיוב" value={c.billing_cycle} />
            <Detail label="הסכם חתום" value={c.signed_agreement_at ? `${c.signed_agreement_name} · v${c.signed_agreement_version ?? 1} · ${new Date(c.signed_agreement_at).toLocaleString("he-IL")}` : "טרם נחתם"} />
            <Detail label="סיבת חסימת שידור" value={c.dispatch_blocked_reason} />
            <Detail label="הכנסות (לפי משלוחים)" value={`₪${(jobStats?.revenue ?? 0).toFixed(2)}`} />
          </CardContent></Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-4" /> עדכוני נמען בוואטסאפ (תשלום)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                שירות נוסף שמשלם — כל הודעה לנמען עולה כסף ב־WhatsApp הרשמי. הפעלה ידנית לכל עסק בלבד.
              </p>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">לאפשר לעסק לשלוח עדכוני ווצאפ לנמען</div>
                  <div className="text-xs text-muted-foreground">
                    כשפעיל, העסק יכול להפעיל את הפיצ׳ר בהגדרות ולכל הזמנה בנפרד.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="size-5"
                  checked={!!c.notify_recipient_allowed}
                  onChange={async (e) => {
                    const allowed = e.target.checked;
                    try {
                      await nestUpdateCustomer(id, {
                        notify_recipient_allowed: allowed,
                        ...(allowed ? {} : { notify_recipient_enabled: false }),
                      });
                      toast.success(allowed ? "הופעל לעסק" : "בוטלה ההרשאה");
                      qc.invalidateQueries({ queryKey: ["admin-business", id] });
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                />
              </label>
              <div className="text-xs text-muted-foreground">
                סטטוס נוכחי של העסק: {c.notify_recipient_enabled ? "מופעל בצד העסק" : "כבוי בצד העסק"}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="jobs">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="size-4" /> 10 משלוחים אחרונים</CardTitle></CardHeader>
          <CardContent>
            {!jobStats?.recent?.length ? (
              <div className="text-center py-8 text-muted-foreground">אין משלוחים עדיין.</div>
            ) : (
              <div className="space-y-2">
                {jobStats.recent.map((j: any) => (
                  <Link key={j.id} to="/jobs" className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30">
                    <div className="text-sm font-mono">#{String(j.id).slice(0, 8)}</div>
                    <Badge variant="secondary">{j.status}</Badge>
                    <div className="text-sm">₪{Number(j.final_price ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString("he-IL")}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardHeader><CardTitle>הערות פנימיות</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea rows={6} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            ) : (
              <div className="whitespace-pre-wrap text-sm">{c.notes || "—"}</div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
