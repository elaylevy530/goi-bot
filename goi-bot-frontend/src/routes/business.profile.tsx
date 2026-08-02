import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nestUpdateMyCustomer } from "@/lib/nest-accounts";
import { Loader2, Upload, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/profile")({
  head: () => ({ meta: [{ title: "פרטי העסק — Goi" }] }),
  ssr: false,
  component: ProfilePage,
});

const BUSINESS_TYPES = ["מסעדה","חנות","עסק מקומי","לקוח פרטי","חברת הפצה","אחר"];

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const [f, setF] = useState<any>({
    name: "", business_name: "", customer_type: "אחר", phone: "", email: "",
    city: "", address: "", business_hours: "", preferred_job_type: "משלוח בודד",
    default_delivery_price: "", invoice_required: false, permanent_courier_notes: "",
    pickup_address: "", pickup_contact_name: "", pickup_contact_phone: "", pickup_instructions: "",
  });
  useEffect(() => {
    if (me) setF({
      name: me.name ?? "",
      business_name: me.business_name ?? "",
      customer_type: me.customer_type ?? "אחר",
      phone: me.phone ?? "",
      email: (me as any).email ?? "",
      city: me.city ?? "",
      address: me.address ?? "",
      business_hours: (me as any).business_hours ?? "",
      preferred_job_type: me.preferred_job_type ?? "משלוח בודד",
      default_delivery_price: (me as any).default_delivery_price ?? "",
      invoice_required: (me as any).invoice_required ?? false,
      permanent_courier_notes: (me as any).permanent_courier_notes ?? "",
      pickup_address: (me as any).pickup_address ?? "",
      pickup_contact_name: (me as any).pickup_contact_name ?? "",
      pickup_contact_phone: (me as any).pickup_contact_phone ?? "",
      pickup_instructions: (me as any).pickup_instructions ?? "",
    });
  }, [me]);


  const save = useMutation({
    mutationFn: async () => {
      if (!me) return;
      await nestUpdateMyCustomer({
        name: f.name,
        business_name: f.business_name || null,
        customer_type: f.customer_type,
        city: f.city || null,
        address: f.address || null,
        email: f.email || null,
        business_hours: f.business_hours || null,
        preferred_job_type: f.preferred_job_type,
        default_delivery_price: f.default_delivery_price ? Number(f.default_delivery_price) : null,
        invoice_required: !!f.invoice_required,
        permanent_courier_notes: f.permanent_courier_notes || null,
        pickup_address: f.pickup_address || null,
        pickup_contact_name: f.pickup_contact_name || null,
        pickup_contact_phone: f.pickup_contact_phone || null,
        pickup_instructions: f.pickup_instructions || null,
      });
    },
    onSuccess: () => { toast.success("נשמר"); qc.invalidateQueries({ queryKey: ["business-me"] }); },
    onError: (e: Error) => toast.error(e.message),
  });


  // Logo — upload blocked until Nest Storage exists; clearing logo_url via Nest is supported.
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const logoPath = (me as any)?.logo_url as string | null | undefined;
  const logoUrl = logoPath && /^https?:\/\//i.test(logoPath) ? logoPath : null;

  function onPickLogo(_file: File) {
    // TODO: wire logo upload through Nest storage.
    toast.info("העלאת לוגו תחזור לאחר Storage ב-Nest");
  }

  async function onRemoveLogo() {
    if (!me || !logoPath) return;
    try {
      setUploading(true);
      await nestUpdateMyCustomer({ logo_url: null });
      toast.success("הלוגו הוסר");
      qc.invalidateQueries({ queryKey: ["business-me"] });
    } catch (e: any) {
      toast.error(e?.message || "שגיאה");
    } finally {
      setUploading(false);
    }
  }

  return (
    <BusinessShell title="פרטי העסק" subtitle="ניהול פרטי החשבון והעדפות">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="max-w-3xl mx-auto space-y-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle>לוגו העסק</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="לוגו" className="size-20 rounded-full object-cover ring-2 ring-white shadow-md border border-slate-200 bg-white" />
                ) : (
                  <div className="size-20 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <ImageIcon className="size-7" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-600 mb-2">התמונה תופיע לשליחים בכרטיס ההצעה למשלוח. PNG/JPG, עד 5MB.</div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickLogo(f); }}
                  />
                  <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {logoPath ? "החלף לוגו" : "העלה לוגו"}
                  </Button>
                  {logoPath && (
                    <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" disabled={uploading} onClick={onRemoveLogo}>
                      <Trash2 className="size-4" />
                      הסר
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle>פרטים כלליים</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>שם איש קשר</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
              <div><Label>שם העסק</Label><Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
              <div>
                <Label>סוג עסק</Label>
                <Select value={f.customer_type} onValueChange={(v) => setF({ ...f, customer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>טלפון</Label><Input value={f.phone} disabled /></div>
              <div><Label>אימייל</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div><Label>עיר ראשית</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>כתובת ראשית</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
              <div><Label>שעות פעילות</Label><Input value={f.business_hours} onChange={(e) => setF({ ...f, business_hours: e.target.value })} placeholder="לדוגמה: א'-ה' 09:00-22:00" /></div>
              <div>
                <Label>סוג משלוח מועדף</Label>
                <Select value={f.preferred_job_type} onValueChange={(v) => setF({ ...f, preferred_job_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="משלוח בודד">משלוח בודד</SelectItem>
                    <SelectItem value="משמרת לפי שעה">משמרת לפי שעה</SelectItem>
                    <SelectItem value="קו קבוע">קו קבוע</SelectItem>
                    <SelectItem value="מכרז שליחים">מכרז שליחים</SelectItem>
                    <SelectItem value="מחיר קבוע">מחיר קבוע</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>מחיר משלוח ברירת מחדל (₪)</Label><Input type="number" value={f.default_delivery_price} onChange={(e) => setF({ ...f, default_delivery_price: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={f.invoice_required} onCheckedChange={(v) => setF({ ...f, invoice_required: v })} /> נדרשת חשבונית כברירת מחדל</label>
            <div><Label>הערות קבועות לשליחים</Label><Textarea rows={3} value={f.permanent_courier_notes} onChange={(e) => setF({ ...f, permanent_courier_notes: e.target.value })} placeholder="לדוגמה: כניסה מאחור, להתקשר בהגעה" /></div>
            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
                {save.isPending && <Loader2 className="size-4 animate-spin" />} שמור
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>פרטי איסוף — ברירת מחדל</CardTitle>
            <div className="text-sm text-slate-500 mt-1">ייטענו אוטומטית בכל משלוח חדש. אפשר לשנות למשלוח ספציפי בטופס עצמו.</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>כתובת איסוף ראשית</Label><Input value={f.pickup_address} onChange={(e) => setF({ ...f, pickup_address: e.target.value })} placeholder="כתובת מלאה כולל עיר" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>שם איש קשר באיסוף</Label><Input value={f.pickup_contact_name} onChange={(e) => setF({ ...f, pickup_contact_name: e.target.value })} placeholder="למי לגשת כשהשליח מגיע" /></div>
              <div><Label>טלפון איש קשר באיסוף</Label><Input type="tel" value={f.pickup_contact_phone} onChange={(e) => setF({ ...f, pickup_contact_phone: e.target.value })} placeholder="למקרה שהשליח מתעכב" /></div>
            </div>
            <div><Label>הוראות איסוף קבועות</Label><Textarea rows={3} value={f.pickup_instructions} onChange={(e) => setF({ ...f, pickup_instructions: e.target.value })} placeholder="לדוגמה: כניסה מהחצר האחורית, לעלות לקומה 2, לבקש את יוסי" /></div>
            <div className="text-xs text-slate-500">הפרטים האלה נחשפים לשליח רק אחרי שהוא נבחר למשלוח.</div>
          </CardContent>
        </Card>
      </form>

    </BusinessShell>
  );
}
