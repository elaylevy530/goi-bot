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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  nestListMyBranches, nestCreateBranch, nestUpdateBranch, nestDeleteBranch, nestSetDefaultBranch,
} from "@/lib/nest-domain";
import { Plus, MapPin, Star, Trash2, Pencil } from "lucide-react";
import { EmptyState } from "./business.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/business/addresses")({
  head: () => ({ meta: [{ title: "כתובות וסניפים — Goi" }] }),
  ssr: false,
  component: AddressesPage,
});

function AddressesPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const blank = { branch_name: "", city: "", full_address: "", contact_person: "", phone: "", courier_notes: "", business_hours: "", is_default: false };
  const [f, setF] = useState<any>(blank);

  const { data: list } = useQuery({
    queryKey: ["branches", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyBranches(),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("no business");
      if (editing) {
        await nestUpdateBranch(editing.id, { ...f });
      } else {
        await nestCreateBranch({ ...f });
      }
    },
    onSuccess: () => { toast.success("נשמר"); setOpen(false); qc.invalidateQueries({ queryKey: ["branches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await nestDeleteBranch(id); },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["branches"] }); },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => { await nestSetDefaultBranch(id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });

  return (
    <BusinessShell title="כתובות וסניפים" subtitle="ניהול כתובות איסוף קבועות">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditing(null); setF(blank); setOpen(true); }} className="bg-[#35AD29] hover:bg-[#2d9623] text-white"><Plus className="size-4" /> הוסף סניף</Button>
      </div>

      {!list || list.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-6">
          <EmptyState icon={MapPin} title="עדיין לא הוספת סניפים" desc="הוסף כתובת איסוף קבועה כדי להזמין מהר יותר." ctaLabel="הוסף סניף ראשון" />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((b: any) => (
            <Card key={b.id} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      {b.branch_name}
                      {b.is_default && <Star className="size-4 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="text-sm text-slate-500">{b.city}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-700 space-y-1 mb-3">
                  {b.full_address && <div>{b.full_address}</div>}
                  {b.contact_person && <div className="text-xs text-slate-500">איש קשר: {b.contact_person} {b.phone && `· ${b.phone}`}</div>}
                  {b.business_hours && <div className="text-xs text-slate-500">שעות: {b.business_hours}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setF({ ...blank, ...b }); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                  {!b.is_default && <Button size="sm" variant="outline" onClick={() => setDefault.mutate(b.id)}><Star className="size-3.5" /></Button>}
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => del.mutate(b.id)}><Trash2 className="size-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "ערוך סניף" : "סניף חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>שם הסניף</Label><Input value={f.branch_name} onChange={(e) => setF({ ...f, branch_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>עיר</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
              <div><Label>כתובת מלאה</Label><Input value={f.full_address} onChange={(e) => setF({ ...f, full_address: e.target.value })} /></div>
              <div><Label>איש קשר</Label><Input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} /></div>
              <div><Label>טלפון</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            </div>
            <div><Label>שעות פעילות</Label><Input value={f.business_hours} onChange={(e) => setF({ ...f, business_hours: e.target.value })} placeholder="לדוגמה: א'-ה' 09:00-22:00" /></div>
            <div><Label>הערות לשליחים</Label><Textarea rows={2} value={f.courier_notes} onChange={(e) => setF({ ...f, courier_notes: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Switch checked={f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: v })} /> סניף ברירת מחדל לאיסוף</label>
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
