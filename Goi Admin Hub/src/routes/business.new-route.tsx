import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { geocodeJob } from "@/lib/geocode-job.functions";

export const Route = createFileRoute("/business/new-route")({
  head: () => ({ meta: [{ title: "קו חלוקה — Goi" }] }),
  ssr: false,
  component: NewRoutePage,
});

function NewRoutePage() {
  const navigate = useNavigate();
  const { data: me } = useMyBusiness();
  const geocode = useServerFn(geocodeJob);
  const [f, setF] = useState({
    pickup_address: "",
    distribution_area: "",
    stops: "",
    date: "",
    start_time: "",
    duration: "",
    payment: "",
    vehicle_required: "",
    notes: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל עסק");
      const { data, error } = await supabase.from("jobs").insert({
        customer_id: me.id,
        customer_name: me.business_name || me.name,
        job_type: "קו חלוקה",
        pickup_address: f.pickup_address || null,
        pickup_area: f.pickup_address || null,
        dropoff_area: f.distribution_area || null,
        job_date: f.date || null,
        job_time: f.start_time || null,
        payment: Number(f.payment) || 0,
        vehicle_required: f.vehicle_required || null,
        number_of_packages: Number(f.stops) || null,
        description: `קו חלוקה · ${f.stops || "?"} עצירות · ${f.duration || "?"} שעות${f.notes ? "\n" + f.notes : ""}`,
        status: "נשלחה לשליחים",
        pricing_type: "fixed_price",
      } as any).select("id, job_number").single();
      if (error) throw new Error(error.message);
      geocode({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));
      return data;
    },
    onSuccess: (data) => {
      toast.success(`קו חלוקה נפתח: ${data.job_number}`);
      navigate({ to: "/business/order/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="הזמנת קו חלוקה" subtitle="קו משלוחים קבוע עם מספר נקודות מסירה">
      <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="space-y-4 max-w-2xl mx-auto">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div><Label>כתובת איסוף / סניף</Label><Input value={f.pickup_address} onChange={(e) => setF({ ...f, pickup_address: e.target.value })} required /></div>
            <div><Label>אזור חלוקה</Label><Input value={f.distribution_area} onChange={(e) => setF({ ...f, distribution_area: e.target.value })} placeholder="לדוגמה: צפון תל אביב" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>מספר עצירות / חבילות</Label><Input type="number" min="1" value={f.stops} onChange={(e) => setF({ ...f, stops: e.target.value })} /></div>
              <div><Label>משך משוער (שעות)</Label><Input type="number" min="0" step="0.5" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></div>
              <div><Label>תאריך</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></div>
              <div><Label>שעת התחלה</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></div>
              <div><Label>תשלום כולל (₪)</Label><Input type="number" min="0" value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })} required /></div>
              <div>
                <Label>סוג רכב</Label>
                <Select value={f.vehicle_required} onValueChange={(v) => setF({ ...f, vehicle_required: v })}>
                  <SelectTrigger><SelectValue placeholder="לא משנה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="קטנוע">קטנוע</SelectItem>
                    <SelectItem value="רכב">רכב</SelectItem>
                    <SelectItem value="אופניים חשמליים">אופניים חשמליים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>הערות</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/business/dashboard" })}>ביטול</Button>
              <Button type="submit" disabled={submit.isPending} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
                {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} פתח קו חלוקה
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </BusinessShell>
  );
}
