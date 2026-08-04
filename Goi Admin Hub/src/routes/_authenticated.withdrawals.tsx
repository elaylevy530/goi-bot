import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WithdrawalStatusBadge } from "@/components/StatusBadges";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS, WITHDRAWAL_STATUSES, type WithdrawalStatus } from "@/lib/constants";
import { Plus, CheckCircle2, XCircle, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/withdrawals")({
  head: () => ({ meta: [{ title: "בקשות משיכה — Goi" }] }),
  component: WithdrawalsPage,
});

function NewWithdrawalDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [courierId, setCourierId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");
  const [account, setAccount] = useState("");
  const [owner, setOwner] = useState("");
  const [bitPhone, setBitPhone] = useState("");
  const [note, setNote] = useState("");

  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers-pick"],
    queryFn: async () => {
      const { data } = await supabase.from("couriers").select("id, full_name, whatsapp_phone").order("full_name");
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("withdrawal_requests").insert({
        courier_id: courierId,
        amount: Number(amount),
        payment_method: method,
        bank_name: bank || null,
        bank_branch: branch || null,
        bank_account: account || null,
        account_owner: owner || null,
        bit_phone: bitPhone || null,
        note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("בקשת משיכה נוצרה");
      setOpen(false);
      setCourierId(""); setAmount(""); setMethod("bank"); setBank(""); setBranch(""); setAccount(""); setOwner(""); setBitPhone(""); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> בקשה חדשה</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>בקשת משיכה חדשה</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>שליח *</Label>
            <Select value={courierId} onValueChange={setCourierId}>
              <SelectTrigger><SelectValue placeholder="בחר שליח" /></SelectTrigger>
              <SelectContent>{couriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name} · {c.whatsapp_phone}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>סכום (₪) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <Label>אמצעי תשלום</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {method === "bank" && (
            <>
              <div><Label>בנק</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
              <div><Label>סניף</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
              <div><Label>חשבון</Label><Input value={account} onChange={(e) => setAccount(e.target.value)} /></div>
              <div><Label>בעל חשבון</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
            </>
          )}
          {(method === "bit" || method === "paybox") && (
            <div className="col-span-2"><Label>טלפון</Label><Input value={bitPhone} onChange={(e) => setBitPhone(e.target.value)} /></div>
          )}
          <div className="col-span-2"><Label>הערה</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={!courierId || !amount || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidDialog({ id }: { id: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [receipt, setReceipt] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("withdrawal_requests").update({
        status: "שולמה",
        reference_number: ref || null,
        receipt_url: receipt || null,
        paid_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("סומן כשולם");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Wallet className="size-4" /> סמן כשולם</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>תיעוד תשלום</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>אסמכתא / מס׳ העברה</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="לדוגמה: 12345678" /></div>
          <div><Label>קישור לקבלה (אופציונלי)</Label><Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="https://..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, couriers(full_name, whatsapp_phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-withdrawals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["withdrawals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: WithdrawalStatus; reason?: string }) => {
      const patch: {
        status: WithdrawalStatus;
        approved_at?: string;
        rejection_reason?: string;
      } = { status };
      if (status === "אושרה") patch.approved_at = new Date().toISOString();
      if (status === "נדחתה") patch.rejection_reason = reason ?? "—";
      const { error } = await supabase.from("withdrawal_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("עודכן");
    },
  });

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const totals = {
    pending: rows.filter((r) => r.status === "ממתינה").reduce((s, r) => s + Number(r.amount), 0),
    approved: rows.filter((r) => r.status === "אושרה").reduce((s, r) => s + Number(r.amount), 0),
    paid: rows.filter((r) => r.status === "שולמה").reduce((s, r) => s + Number(r.amount), 0),
  };

  return (
    <AdminLayout title="בקשות משיכת כספים" subtitle="ניהול ואישור משיכות שליחים" actions={<NewWithdrawalDialog />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">ממתינות לאישור</div><div className="text-2xl font-bold mt-2 text-amber-700">{totals.pending.toFixed(0)} ₪</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">מאושרות (טרם שולמו)</div><div className="text-2xl font-bold mt-2 text-sky-700">{totals.approved.toFixed(0)} ₪</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">שולם סה״כ</div><div className="text-2xl font-bold mt-2 text-primary">{totals.paid.toFixed(0)} ₪</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>בקשות</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {WITHDRAWAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>שליח</TableHead><TableHead>טלפון</TableHead><TableHead>סכום</TableHead>
              <TableHead>אמצעי</TableHead><TableHead>פרטים</TableHead><TableHead>סטטוס</TableHead>
              <TableHead>אסמכתא</TableHead><TableHead>נוצר</TableHead><TableHead className="text-end">פעולות</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">אין בקשות עדיין.</TableCell></TableRow>
              )}
              {filtered.map((r) => {
                const c = (r.couriers as { full_name: string; whatsapp_phone: string } | null);
                const method = PAYMENT_METHODS.find((m) => m.value === r.payment_method)?.label ?? r.payment_method;
                const details = r.payment_method === "bank"
                  ? `${r.bank_name ?? ""} ${r.bank_branch ?? ""} ${r.bank_account ?? ""}`.trim()
                  : r.bit_phone ?? "";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{c?.full_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{c?.whatsapp_phone ?? "—"}</TableCell>
                    <TableCell className="font-bold">{Number(r.amount).toFixed(2)} ₪</TableCell>
                    <TableCell><Badge variant="secondary">{method}</Badge></TableCell>
                    <TableCell className="text-xs">{details || "—"}</TableCell>
                    <TableCell><WithdrawalStatusBadge status={r.status as WithdrawalStatus} /></TableCell>
                    <TableCell className="font-mono text-xs">{r.reference_number ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex gap-1 justify-end">
                        {r.status === "ממתינה" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "אושרה" })}>
                              <CheckCircle2 className="size-4 text-primary" /> אשר
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              const reason = window.prompt("סיבת דחייה?") || "";
                              updateStatus.mutate({ id: r.id, status: "נדחתה", reason });
                            }}>
                              <XCircle className="size-4 text-destructive" /> דחה
                            </Button>
                          </>
                        )}
                        {(r.status === "אושרה" || r.status === "ממתינה") && <MarkPaidDialog id={r.id} />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
