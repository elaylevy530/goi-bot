import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { geocodeJob } from "@/lib/geocode-job.functions";

export const Route = createFileRoute("/business/new-shift")({
  head: () => ({ meta: [{ title: "שליח למשמרת — Goi" }] }),
  ssr: false,
  component: NewShiftPage,
});

function NewShiftPage() {
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const geocode = useServerFn(geocodeJob);
  const [f, setF] = useState({
    date: "",
    start_time: "",
    end_time: "",
    address: "",
    couriers_needed: "1",
    hourly_payment: "",
    vehicle_required: "",
    experience_required: false,
    invoice_required: false,
    notes: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל עסק");
      const payload: any = {
        customer_id: me.id,
        customer_name: me.business_name || me.name,
        job_type: "משמרת לפי שעה",
        pickup_address: f.address || null,
        pickup_area: f.address || null,
        job_date: f.date || null,
        job_time: f.start_time || null,
        payment: Number(f.hourly_payment) || 0,
        couriers_needed: Number(f.couriers_needed) || 1,
        vehicle_required: f.vehicle_required || null,
        invoice_required: f.invoice_required,
        description: `משמרת ${f.start_time}-${f.end_time}${f.experience_required ? " · נדרש ניסיון" : ""}${f.notes ? "\n" + f.notes : ""}`,
        status: "נשלחה לשליחים",
        pricing_type: "fixed_price",
      };
      const { data, error } = await supabase.from("jobs").insert(payload).select("id, job_number").single();
      if (error) throw new Error(error.message);
      geocode({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));
      return data;
    },
    onSuccess: (data) => {
      toast.success(`משמרת נפתחה: ${data.job_number}`);
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="הזמנת שליח למשמרת" subtitle="שליח לפי שעות, לעסק שלך">
      <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-4 max-w-2xl mx-auto">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>תאריך</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></div>
              <div><Label>שעת התחלה</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></div>
              <div><Label>שעת סיום</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></div>
            </div>
            <div><Label>סניף / כתובת</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>מספר שליחים נדרשים</Label><Input type="number" min="1" value={f.couriers_needed} onChange={(e) => setF({ ...f, couriers_needed: e.target.value })} /></div>
              <div><Label>תשלום לשעה (₪)</Label><Input type="number" min="0" value={f.hourly_payment} onChange={(e) => setF({ ...f, hourly_payment: e.target.value })} required /></div>
              <div>
                <Label>סוג רכב נדרש</Label>
                <Select value={f.vehicle_required} onValueChange={(v) => setF({ ...f, vehicle_required: v })}>
                  <SelectTrigger><SelectValue placeholder="לא משנה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="קטנוע">קטנוע</SelectItem>
                    <SelectItem value="אופניים חשמליים">אופניים חשמליים</SelectItem>
                    <SelectItem value="רכב">רכב</SelectItem>
                    <SelectItem value="קורקינט חשמלי">קורקינט חשמלי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2"><Switch checked={f.experience_required} onCheckedChange={(v) => setF({ ...f, experience_required: v })} /> נדרש ניסיון</label>
              <label className="flex items-center gap-2"><Switch checked={f.invoice_required} onCheckedChange={(v) => setF({ ...f, invoice_required: v })} /> נדרשת חשבונית</label>
            </div>
            <div><Label>הערות</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/business/dashboard" })}>ביטול</Button>
              <Button type="submit" disabled={submit.isPending} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
                {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} הזמן שליח למשמרת
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </BusinessShell>
  );
}
