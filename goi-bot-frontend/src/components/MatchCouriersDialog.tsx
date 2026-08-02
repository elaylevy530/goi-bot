import { memo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { findMatchingCouriers, type CourierMatch } from "@/lib/matching.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, Phone, Star, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jobId: string;
  jobNumber: string;
}

export const MatchCouriersDialog = memo(function MatchCouriersDialog({ jobId, jobNumber }: Props) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(findMatchingCouriers);
  const mutation = useMutation({
    mutationFn: () => fn({ data: { job_id: jobId, limit: 15 } }),
    onError: (err: Error) => toast.error(err.message || "שגיאה בחיפוש שליחים"),
  });

  function handleOpen() {
    setOpen(true);
    if (!mutation.data) mutation.mutate();
  }

  const matches: CourierMatch[] = mutation.data?.matches ?? [];

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1">
        <Sparkles className="size-3.5" /> מצא שליחים
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              שליחים מתאימים — עבודה {jobNumber}
            </DialogTitle>
            <DialogDescription>דירוג לפי קרבה, היסטוריית ביצועים, עומס נוכחי והתאמת רכב/סוג עבודה.</DialogDescription>
          </DialogHeader>

          {mutation.isPending && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin ml-2" /> מחשב התאמות...
            </div>
          )}

          {!mutation.isPending && matches.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">לא נמצאו שליחים פעילים</div>
          )}

          <div className="space-y-3">
            {matches.map((m, idx) => (
              <Card key={m.courier_id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={idx === 0 ? "default" : "secondary"} className="font-mono shrink-0">
                      #{idx + 1}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {m.base_city && <span>{m.base_city}</span>}
                        {m.vehicle_label && <span>· {m.vehicle_label}</span>}
                        <a href={`https://wa.me/${m.whatsapp_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-600 hover:underline">
                          <Phone className="size-3" /> {m.whatsapp_phone}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-2xl font-bold text-primary">{m.score}</div>
                    <div className="text-[10px] text-muted-foreground">ציון התאמה</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2 border-y py-2">
                  {m.acceptance_rate != null && (
                    <span className="flex items-center gap-1"><TrendingUp className="size-3" /> קבלה: {m.acceptance_rate.toFixed(0)}%</span>
                  )}
                  {m.on_time_rate != null && (
                    <span className="flex items-center gap-1"><Clock className="size-3" /> בזמן: {m.on_time_rate.toFixed(0)}%</span>
                  )}
                  {m.avg_rating != null && (
                    <span className="flex items-center gap-1"><Star className="size-3" /> {m.avg_rating.toFixed(1)}</span>
                  )}
                  <span>השלים: {m.jobs_completed}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {m.reasons.map((r, i) => (
                    <Badge key={i} variant={r.points > 0 ? "secondary" : r.points < 0 ? "destructive" : "outline"} className="text-[11px] font-normal">
                      {r.label} {r.points !== 0 && <span className="opacity-70 mr-1">({r.points > 0 ? "+" : ""}{r.points})</span>}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
