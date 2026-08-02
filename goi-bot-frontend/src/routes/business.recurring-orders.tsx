import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  nestListRecurringOrders, nestSaveRecurringOrder, nestDeleteRecurringOrder, nestToggleRecurringOrderActive,
} from "@/lib/nest-domain";
import { Plus, Pause, Play, Trash2, Repeat, Pencil } from "lucide-react";
import { EmptyState } from "./business.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/business/recurring-orders")({
  head: () => ({ meta: [{ title: "הזמנות קבועות — Goi" }] }),
  ssr: false,
  component: RecurringPage,
});

const TYPES = [
  "משמרת קבועה כל יום",
  "משמרת קבועה בימים מסוימים",
  "קו חלוקה שבועי",
  "משלוח קבוע לכתובת",
  "משלוחים לפי שעות עומס",
];
const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

function RecurringPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: list } = useQuery({
    queryKey: ["recurring", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListRecurringOrders(),
  });

  const blank = { recurrence_type: TYPES[0], days_of_week: [] as number[], start_time: "", end_time: "", pickup_address: "", dropoff_address: "", payment: "", couriers_needed: "1", active: true, notes: "" };
  const [f, setF] = useState<any>(blank);

  const openNew = () => { setEditing(null); setF(blank); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setF({ ...blank, ...r, payment: r.payment ?? "", couriers_needed: r.couriers_needed ?? "1" }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("no business");
      const payload = {
        business_id: me.id,
        recurrence_type: f.recurrence_type,
        days_of_week: f.days_of_week,
        start_time: f.start_time || null,
        end_time: f.end_time || null,
        pickup_address: f.pickup_address || null,
        dropoff_address: f.dropoff_address || null,
        payment: Number(f.payment) || null,
        couriers_needed: Number(f.couriers_needed) || 1,
        active: f.active,
        notes: f.notes || null,
      };
      await nestSaveRecurringOrder(payload, editing?.id);
    },
    onSuccess: () => { toast.success("נשמר"); setOpen(false); qc.invalidateQueries({ queryKey: ["recurring"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await nestToggleRecurringOrderActive(id, active);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await nestDeleteRecurringOrder(id); },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["recurring"] }); },
  });

  return (
    <BusinessShell title="הזמנות קבועות" subtitle="משמרות, קווי חלוקה ומשלוחים חוזרים">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew} className="bg-[#35AD29] hover:bg-[#2d9623] text-white"><Plus className="size-4" /> הזמנה קבועה חדשה</Button>
      </div>

      {!list || list.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-6">
          <EmptyState icon={Repeat} title="עדיין אין הזמנות קבועות" desc="צור משמרת חוזרת, קו חלוקה שבועי או משלוח קבוע — וחסוך זמן." />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((r: any) => (
            <Card key={r.id} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-extrabold text-slate-900">{r.recurrence_type}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {r.start_time && r.end_time && `${r.start_time}-${r.end_time}`}
                      {r.days_of_week?.length > 0 && ` · ${r.days_of_week.map((d: number) => DAYS[d]).join(", ")}`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${r.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{r.active ? "פעיל" : "מושהה"}</span>
                </div>
                {r.pickup_address && <div className="text-sm text-slate-600">איסוף: {r.pickup_address}</div>}
                {r.payment && <div className="text-sm font-bold mt-1">₪{Number(r.payment).toLocaleString("he-IL")}</div>}
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="size-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: r.id, active: !r.active })}>{r.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => del.mutate(r.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "ערוך הזמנה קבועה" : "הזמנה קבועה חדשה"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>סוג</Label>
              <Select value={f.recurrence_type} onValueChange={(v) => setF({ ...f, recurrence_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ימים</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => setF({ ...f, days_of_week: f.days_of_week.includes(i) ? f.days_of_week.filter((x: number) => x !== i) : [...f.days_of_week, i] })}
                    className={`size-9 rounded-lg border-2 font-bold text-sm ${f.days_of_week.includes(i) ? "border-[#35AD29] bg-emerald-50 text-[#35AD29]" : "border-slate-200"}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>שעת התחלה</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></div>
              <div><Label>שעת סיום</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></div>
            </div>
            <div><Label>כתובת איסוף</Label><Input value={f.pickup_address} onChange={(e) => setF({ ...f, pickup_address: e.target.value })} /></div>
            <div><Label>כתובת מסירה (אם רלוונטי)</Label><Input value={f.dropoff_address} onChange={(e) => setF({ ...f, dropoff_address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>תשלום (₪)</Label><Input type="number" value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })} /></div>
              <div><Label>מספר שליחים</Label><Input type="number" min="1" value={f.couriers_needed} onChange={(e) => setF({ ...f, couriers_needed: e.target.value })} /></div>
            </div>
            <div><Label>הערות</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> פעיל</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={() => save.mutate()} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessShell>
  );
}
