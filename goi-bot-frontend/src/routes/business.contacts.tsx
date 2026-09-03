import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { nestListSavedContacts, nestUpsertSavedContact, nestDeleteSavedContact } from "@/lib/nest-domain";
import { Users, Plus, Pencil, Trash2, Phone, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";

export const Route = createFileRoute("/business/contacts")({
  head: () => ({ meta: [{ title: "אנשי קשר — Goi" }] }),
  ssr: false,
  component: ContactsPage,
});

type Contact = {
  id: string;
  contact_name: string;
  phone: string | null;
  city: string | null;
  full_address: string | null;
  notes: string | null;
  tags: string[] | null;
  usage_count: number;
};

const emptyForm = { contact_name: "", phone: "", city: "", full_address: "", notes: "", tags: "" };

function ContactsPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["contacts", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListSavedContacts() as Promise<Contact[]>,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!me) return;
      const payload: Record<string, unknown> = {
        contact_name: form.contact_name,
        phone: form.phone || null,
        city: form.city || null,
        full_address: form.full_address || null,
        notes: form.notes || null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      if (editing) payload.id = editing.id;
      await nestUpsertSavedContact(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "איש קשר עודכן" : "איש קשר נוסף");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await nestDeleteSavedContact(id); },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      contact_name: c.contact_name,
      phone: c.phone || "", city: c.city || "", full_address: c.full_address || "",
      notes: c.notes || "", tags: (c.tags || []).join(", "),
    });
    setOpen(true);
  };

  const filtered = (contacts ?? []).filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.contact_name.toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.city || "").toLowerCase().includes(q);
  });

  return (
    <BusinessShell title="אנשי קשר" subtitle="נמענים תכופים — מילוי אוטומטי בהזמנת משלוח" headerExtra={
      <div className="flex justify-end">
        <Button onClick={openNew} className="bg-primary-deep hover:bg-primary-deep/90"><Plus className="size-4" /> הוסף איש קשר</Button>
      </div>
    }>
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="relative max-w-md mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי שם / טלפון / עיר" className="pr-9" />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="עדיין אין אנשי קשר" desc="הוסף נמענים תכופים כדי לחסוך זמן בהזמנות הבאות." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(c => (
                <Card key={c.id} className="rounded-xl border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{c.contact_name}</div>
                        {c.phone && <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="size-3" /> {c.phone}</div>}
                        {(c.city || c.full_address) && <div className="text-xs text-slate-500 flex items-start gap-1 mt-1"><MapPin className="size-3 mt-0.5 shrink-0" /> <span className="truncate">{c.full_address || c.city}</span></div>}
                        {c.tags && c.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {c.tags.map(t => <span key={t} className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{t}</span>)}
                          </div>
                        )}
                        {c.usage_count > 0 && <div className="text-[10px] text-slate-400 mt-2">נשלחו אליו {c.usage_count} משלוחים</div>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="size-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("למחוק?")) remove.mutate(c.id); }}><Trash2 className="size-3.5 text-red-500" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>שם *</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>עיר</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div><Label>כתובת מלאה</Label><Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} /></div>
            <div><Label>תגיות (בית, עבודה, וכו')</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="מופרדות בפסיק" /></div>
            <div><Label>הערות</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.contact_name} className="bg-primary-deep hover:bg-primary-deep/90">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessShell>
  );
}
