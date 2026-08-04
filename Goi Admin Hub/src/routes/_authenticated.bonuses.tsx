import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Plus, Pencil, Trash2, Sparkles, Flame, Target, Trophy, Zap, Star, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bonuses")({
  component: BonusesAdmin,
});

const ICONS: Record<string, any> = { Sparkles, Flame, Target, Trophy, Zap, Star, Gift };
const COLORS = [
  { v: "orange", c: "bg-orange-50 text-orange-600 border-orange-200" },
  { v: "emerald", c: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { v: "amber", c: "bg-amber-50 text-amber-600 border-amber-200" },
  { v: "rose", c: "bg-rose-50 text-rose-600 border-rose-200" },
  { v: "sky", c: "bg-sky-50 text-sky-600 border-sky-200" },
  { v: "violet", c: "bg-violet-50 text-violet-600 border-violet-200" },
];

type Bonus = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  icon: string;
  color: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
};

const empty = {
  title: "",
  description: "",
  amount: 20,
  icon: "Sparkles",
  color: "orange",
  is_active: true,
  starts_at: "",
  ends_at: "",
  sort_order: 0,
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function BonusesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const { data: bonuses = [], isLoading } = useQuery({
    queryKey: ["admin-bonuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_bonuses")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bonus[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        amount: Number(form.amount) || 0,
        icon: form.icon,
        color: form.color,
        is_active: form.is_active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.title) throw new Error("חסר שם הבונוס");
      if (editing) {
        const { error } = await supabase.from("courier_bonuses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courier_bonuses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "הבונוס עודכן" : "הבונוס נוסף");
      setOpen(false);
      setEditing(null);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-bonuses"] });
      qc.invalidateQueries({ queryKey: ["courier-active-bonuses"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שגיאה"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_bonuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הבונוס נמחק");
      qc.invalidateQueries({ queryKey: ["admin-bonuses"] });
      qc.invalidateQueries({ queryKey: ["courier-active-bonuses"] });
    },
    onError: (e: any) => toast.error(e.message ?? "שגיאה"),
  });

  const toggleActive = useMutation({
    mutationFn: async (b: Bonus) => {
      const { error } = await supabase.from("courier_bonuses").update({ is_active: !b.is_active }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bonuses"] });
      qc.invalidateQueries({ queryKey: ["courier-active-bonuses"] });
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (b: Bonus) => {
    setEditing(b);
    setForm({
      title: b.title,
      description: b.description ?? "",
      amount: b.amount,
      icon: b.icon,
      color: b.color,
      is_active: b.is_active,
      starts_at: toLocalInput(b.starts_at),
      ends_at: toLocalInput(b.ends_at),
      sort_order: b.sort_order,
    });
    setOpen(true);
  };

  return (
    <AdminLayout title="ניהול בונוסים" subtitle="בונוסים שיוצגו לכל השליחים">
      <div dir="rtl" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Gift className="size-6 text-orange-500" /> ניהול בונוסים לשליחים
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              הבונוסים שתוסיף כאן יוצגו בדאשבורד של כל השליחים בזמן אמת.
            </p>
          </div>
          <Button onClick={openNew} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
            <Plus className="size-4 ml-2" /> בונוס חדש
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : bonuses.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-slate-300">
            <CardContent className="p-10 text-center">
              <Gift className="size-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">אין בונוסים פעילים כרגע. הוסף את הבונוס הראשון כדי לדרבן את השליחים.</p>
              <Button onClick={openNew} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
                <Plus className="size-4 ml-2" /> בונוס חדש
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bonuses.map((b) => {
              const Icon = ICONS[b.icon] ?? Sparkles;
              const color = COLORS.find((c) => c.v === b.color)?.c ?? COLORS[0].c;
              const expired = b.ends_at ? new Date(b.ends_at) < new Date() : false;
              const notStarted = b.starts_at ? new Date(b.starts_at) > new Date() : false;
              return (
                <Card key={b.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`size-11 rounded-xl grid place-items-center border ${color} shrink-0`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 truncate">{b.title}</h3>
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">+₪{b.amount}</Badge>
                        </div>
                        {b.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-slate-500">
                          {!b.is_active && <Badge variant="secondary">כבוי</Badge>}
                          {expired && <Badge variant="destructive">פג תוקף</Badge>}
                          {notStarted && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">מתחיל ב-{new Date(b.starts_at!).toLocaleString("he-IL")}</Badge>}
                          {b.ends_at && !expired && (
                            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> עד {new Date(b.ends_at).toLocaleString("he-IL")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Switch checked={b.is_active} onCheckedChange={() => toggleActive.mutate(b)} />
                        <span className="text-xs text-slate-600">{b.is_active ? "פעיל" : "כבוי"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(`למחוק את הבונוס "${b.title}"?`)) remove.mutate(b.id);
                        }}>
                          <Trash2 className="size-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת בונוס" : "בונוס חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>שם הבונוס</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="לדוגמה: בונוס סוף שבוע" />
            </div>
            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="הסבר קצר שיופיע לשליח" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>סכום (₪)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>סדר הצגה</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>אייקון</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(ICONS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>צבע</Label>
                <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => <SelectItem key={c.v} value={c.v}>{c.v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תקף מ-</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>תקף עד</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <span>פעיל</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">
              {save.isPending && <Loader2 className="size-4 animate-spin ml-2" />}
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
