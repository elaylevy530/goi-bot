import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { nestListMySupportTickets, nestCreateSupportTicket } from "@/lib/nest-domain";
import { MessageSquare, Plus, AlertCircle } from "lucide-react";
import { EmptyState } from "./business.dashboard";
import { toast } from "sonner";
import { supportWhatsAppUrl } from "@/lib/support";

const ISSUE_TYPES = ["שליח לא הגיע", "איחור", "בעיה במסירה", "בעיה בתשלום", "שאלה כללית"];
const SUPPORT_WHATSAPP = supportWhatsAppUrl("שלום, אני צריך עזרה בפאנל העסקים של Goi");

export const Route = createFileRoute("/business/support")({
  head: () => ({ meta: [{ title: "תמיכה — Goi" }] }),
  ssr: false,
  component: SupportPage,
});

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-800",
  resolved: "bg-emerald-50 text-emerald-800",
  closed: "bg-slate-100 text-slate-500",
};
const STATUS_HE: Record<string, string> = { open: "פתוח", in_progress: "בטיפול", resolved: "נפתר", closed: "סגור" };

function SupportPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ issue_type: ISSUE_TYPES[0], message: "", job_id: "" });

  const { data: tickets } = useQuery({
    queryKey: ["tickets", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMySupportTickets(),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!me) return;
      await nestCreateSupportTicket({
        issue_type: f.issue_type,
        message: f.message,
        job_id: f.job_id || null,
      });
    },
    onSuccess: () => { toast.success("הקריאה נפתחה ✓"); setOpen(false); setF({ issue_type: ISSUE_TYPES[0], message: "", job_id: "" }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="תמיכה והודעות" subtitle="פתח קריאה או דבר עם נציג">
      <div className="flex justify-end gap-2 mb-4">
        <Button asChild variant="outline"><a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer"><MessageSquare className="size-4" /> פתח וואטסאפ</a></Button>
        <Button onClick={() => setOpen(true)} className="bg-[#35AD29] hover:bg-[#2d9623] text-white"><Plus className="size-4" /> פתח קריאה חדשה</Button>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <h2 className="text-lg font-extrabold text-slate-900 text-right mb-3">הקריאות שלי</h2>
          {!tickets || tickets.length === 0 ? (
            <EmptyState icon={AlertCircle} title="אין קריאות פתוחות" desc="אם נתקלת בבעיה — פתח קריאה ונחזור אליך בהקדם." />
          ) : (
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="size-10 rounded-xl bg-slate-100 grid place-items-center shrink-0"><AlertCircle className="size-4 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{t.issue_type}</span>
                      {t.jobs && <span className="text-xs font-mono text-slate-500">{t.jobs.job_number}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_STYLE[t.status]}`}>{STATUS_HE[t.status]}</span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.message}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(t.created_at).toLocaleString("he-IL")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>פתח קריאת תמיכה</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>סוג הבעיה</Label>
              <Select value={f.issue_type} onValueChange={(v) => setF({ ...f, issue_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תיאור</Label><Textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={() => submit.mutate()} disabled={!f.message} className="bg-[#35AD29] hover:bg-[#2d9623] text-white">שלח</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessShell>
  );
}
