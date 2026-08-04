import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nestCreateCustomer, nestListCustomers } from "@/lib/nest-accounts";
import { CUSTOMER_TYPES, PREFERRED_JOB_TYPES, CUSTOMER_STATUSES } from "@/lib/constants";
import { ViewPanelButton } from "@/components/ViewPanelButton";
import { Plus, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "מזמינים — Goi" }] }),
  component: CustomersPage,
});

function NewCustomerDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "", phone: "", customer_type: "אחר", business_name: "",
    city: "", address: "", preferred_job_type: "משלוח בודד", status: "חדש",
  });

  const mut = useMutation({
    mutationFn: async () => {
      await nestCreateCustomer({
        name: f.name,
        phone: f.phone,
        customer_type: f.customer_type,
        business_name: f.business_name || null,
        city: f.city || null,
        address: f.address || null,
        status: f.status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("מזמין נוסף");
      setOpen(false);
      setF({ name: "", phone: "", customer_type: "אחר", business_name: "", city: "", address: "", preferred_job_type: "משלוח בודד", status: "חדש" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> מזמין חדש</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>הוספת מזמין</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>שם איש קשר *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>טלפון *</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div>
            <Label>סוג</Label>
            <Select value={f.customer_type} onValueChange={(v) => setF({ ...f, customer_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUSTOMER_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>שם עסק</Label><Input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
          <div><Label>עיר</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div className="col-span-2"><Label>כתובת</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div>
            <Label>סוג עבודה מועדף</Label>
            <Select value={f.preferred_job_type} onValueChange={(v) => setF({ ...f, preferred_job_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PREFERRED_JOB_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>סטטוס</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CUSTOMER_STATUSES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={!f.name || !f.phone || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => nestListCustomers({ limit: 500 }),
  });

  return (
    <AdminLayout title="מזמינים / עסקים" subtitle={`${customers.length} מזמינים`} actions={<NewCustomerDialog />}>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead><TableHead>טלפון</TableHead><TableHead>סוג</TableHead>
                <TableHead>שם עסק</TableHead><TableHead>עיר</TableHead><TableHead>כתובת</TableHead>
                <TableHead>סוג עבודה מועדף</TableHead><TableHead>סטטוס</TableHead><TableHead>נוצר</TableHead>
                <TableHead className="text-end">פעולה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>}
              {!isLoading && customers.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">אין מזמינים עדיין.</TableCell></TableRow>
              )}
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{c.customer_type}</Badge></TableCell>
                  <TableCell>{c.business_name ?? "—"}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.address ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.preferred_job_type ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={c.status === "פעיל" ? "bg-primary/10 text-primary border-primary/20" : c.status === "חדש" ? "bg-sky-100 text-sky-700 border-sky-200" : "bg-amber-100 text-amber-700 border-amber-200"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell className="text-end">
                    <div className="inline-flex items-center gap-1">
                      <ViewPanelButton
                        panel={c.customer_type === "business" ? "business" : "customer"}
                        entityId={c.id}
                        label="פאנל"
                        variant="outline"
                        size="sm"
                      />
                      <Button size="icon" variant="ghost" onClick={() => {
                        const phone = c.phone.replace(/\D/g, "").replace(/^0/, "972");
                        window.open(`https://wa.me/${phone}`, "_blank");
                      }}><MessageCircle className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AdminLayout>
  );
}
