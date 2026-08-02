import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { nestSubmitJobQuote } from "@/lib/nest-jobs";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Existing = {
  id?: string;
  price?: number | string | null;
  estimated_arrival_minutes?: number | null;
  estimated_delivery_minutes?: number | null;
  note?: string | null;
  includes_invoice?: boolean | null;
  is_final_price?: boolean | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  jobNumber?: string | null;
  existing?: Existing | null;
}

export function SubmitQuoteDialog({ open, onOpenChange, jobId, jobNumber, existing }: Props) {
  const qc = useQueryClient();
  const [price, setPrice] = useState("");
  const [arrival, setArrival] = useState("");
  const [delivery, setDelivery] = useState("");
  const [note, setNote] = useState("");
  const [invoice, setInvoice] = useState(false);
  const [isFinal, setIsFinal] = useState(true);

  useEffect(() => {
    if (!open) return;
    setPrice(existing?.price != null ? String(existing.price) : "");
    setArrival(existing?.estimated_arrival_minutes != null ? String(existing.estimated_arrival_minutes) : "");
    setDelivery(existing?.estimated_delivery_minutes != null ? String(existing.estimated_delivery_minutes) : "");
    setNote(existing?.note ?? "");
    setInvoice(!!existing?.includes_invoice);
    setIsFinal(existing?.is_final_price ?? true);
  }, [open, existing]);

  const submit = useMutation({
    mutationFn: async () => {
      const p = Number(price);
      if (!p || p <= 0) throw new Error("יש להזין מחיר תקין");
      return nestSubmitJobQuote(jobId, {
        price: p,
        estimated_arrival_minutes: arrival ? Number(arrival) : undefined,
        estimated_delivery_minutes: delivery ? Number(delivery) : undefined,
        note: note || undefined,
        includes_invoice: invoice,
        is_final_price: isFinal,
      });
    },
    onSuccess: () => {
      toast.success("ההצעה נשלחה למזמין ועברה ל\"ההצעות שלי\". נעדכן אותך אם תיבחר.");
      qc.invalidateQueries({ queryKey: ["courier-my-quotes"] });
      qc.invalidateQueries({ queryKey: ["my-quotes-on-open"] });
      qc.invalidateQueries({ queryKey: ["courier-quote-requests"] });
      qc.invalidateQueries({ queryKey: ["business-quote-requests"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader className="text-end">
          <DialogTitle>{existing?.id ? "עדכן הצעת מחיר" : "הגש הצעת מחיר"}</DialogTitle>
          <DialogDescription>
            {jobNumber ? `עבודה #${jobNumber}` : "בקשת משלוח להצעת מחיר"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-end">
          <div>
            <Label>מחיר ההצעה (₪)</Label>
            <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            <p className="text-[11px] text-slate-500 mt-1">
              המזמין יראה את המחיר, הדירוג שלך וזמן ההגעה המשוער.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>זמן הגעה (דק׳)</Label>
              <Input type="number" inputMode="numeric" value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="15" />
            </div>
            <div>
              <Label>זמן ביצוע (דק׳)</Label>
              <Input type="number" inputMode="numeric" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="30" />
            </div>
          </div>
          <div>
            <Label>הערה למזמין</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="זמין מיידית, רכב גדול וכו׳" />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="text-sm">כולל חשבונית</div>
            <Switch checked={invoice} onCheckedChange={setInvoice} />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="text-sm">המחיר סופי</div>
            <Switch checked={isFinal} onCheckedChange={setIsFinal} />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button className="bg-[#35AD29] hover:bg-[#2d9623] text-white" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} שלח הצעה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
