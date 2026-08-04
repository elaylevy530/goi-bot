import { memo, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { jobId: string; jobNumber: string; courierId?: string | null };

export const JobOutcomeDialog = memo(function JobOutcomeDialog({ jobId, jobNumber, courierId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pickedUp, setPickedUp] = useState("");
  const [delivered, setDelivered] = useState("");
  const [wasLate, setWasLate] = useState(false);
  const [lateMin, setLateMin] = useState("");
  const [wasCancelled, setWasCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState("");
  const [notes, setNotes] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["job_outcome", jobId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("job_outcomes").select("*").eq("job_id", jobId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setPickedUp(existing.picked_up_at ? new Date(existing.picked_up_at).toISOString().slice(0, 16) : "");
    setDelivered(existing.delivered_at ? new Date(existing.delivered_at).toISOString().slice(0, 16) : "");
    setWasLate(!!existing.was_late);
    setLateMin(existing.late_minutes?.toString() ?? "");
    setWasCancelled(!!existing.was_cancelled);
    setCancelReason(existing.cancellation_reason ?? "");
    setRating(existing.customer_rating?.toString() ?? "");
    setComment(existing.customer_comment ?? "");
    setTip(existing.tip_amount?.toString() ?? "");
    setNotes(existing.internal_notes ?? "");
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!courierId) throw new Error("אין שליח נבחר למשימה");
      const payload = {
        job_id: jobId,
        courier_id: courierId,
        picked_up_at: pickedUp ? new Date(pickedUp).toISOString() : null,
        delivered_at: delivered ? new Date(delivered).toISOString() : null,
        was_late: wasLate,
        late_minutes: lateMin ? Number(lateMin) : null,
        was_cancelled: wasCancelled,
        cancellation_reason: cancelReason || null,
        customer_rating: rating ? Number(rating) : null,
        customer_comment: comment || null,
        tip_amount: tip ? Number(tip) : null,
        internal_notes: notes || null,
      };
      const { error } = await supabase.from("job_outcomes").upsert(payload, { onConflict: "job_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("תוצאת המשימה נשמרה — סטטיסטיקות השליח יתעדכנו");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job_outcome", jobId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!courierId} title={!courierId ? "אין שליח נבחר" : ""}>
          <ClipboardCheck className="size-4" /> תוצאה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>תוצאת משימה #{jobNumber}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>זמן איסוף</Label><Input type="datetime-local" value={pickedUp} onChange={(e) => setPickedUp(e.target.value)} /></div>
          <div><Label>זמן מסירה</Label><Input type="datetime-local" value={delivered} onChange={(e) => setDelivered(e.target.value)} /></div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div><div className="text-sm font-medium">בוצע באיחור</div></div>
            <Switch checked={wasLate} onCheckedChange={setWasLate} />
          </div>
          <div><Label>דקות איחור</Label><Input type="number" value={lateMin} onChange={(e) => setLateMin(e.target.value)} disabled={!wasLate} /></div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div><div className="text-sm font-medium">בוטלה</div></div>
            <Switch checked={wasCancelled} onCheckedChange={setWasCancelled} />
          </div>
          <div><Label>סיבת ביטול</Label><Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} disabled={!wasCancelled} /></div>
          <div><Label>דירוג לקוח (1–5)</Label><Input type="number" min={1} max={5} step={0.5} value={rating} onChange={(e) => setRating(e.target.value)} /></div>
          <div><Label>טיפ (₪)</Label><Input type="number" value={tip} onChange={(e) => setTip(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>הערת לקוח</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} /></div>
          <div className="md:col-span-2"><Label>הערות פנימיות</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !courierId}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} שמירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
