import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nestListCourierQuotes } from "@/lib/nest-jobs";
import { Inbox, MapPin, Clock, Pencil, Eye } from "lucide-react";
import { SubmitQuoteDialog } from "@/components/SubmitQuoteDialog";
import { useCourierTerms } from "@/lib/courier-kind";

export const Route = createFileRoute("/courier/my-quotes")({
  head: () => ({ meta: [{ title: "הצעות המחיר שלי — Goi" }] }),
  component: MyQuotesPage,
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "ממתין לאישור", cls: "bg-slate-100 text-slate-700" },
  shortlisted: { label: "הוצג למזמין", cls: "bg-amber-100 text-amber-800" },
  selected: { label: "נבחרה 🎉", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "לא נבחרה", cls: "bg-rose-100 text-rose-800" },
  expired: { label: "פג תוקף", cls: "bg-slate-100 text-slate-500" },
  cancelled: { label: "בוטלה", cls: "bg-slate-100 text-slate-500" },
};

const TABS = [
  { key: "open", label: "ממתינות לתשובה", match: (s: string) => s === "pending" || s === "shortlisted" },
  { key: "won", label: "אושרו ✓", match: (s: string) => s === "selected" },
  { key: "lost", label: "לא נבחרו", match: (s: string) => s === "rejected" || s === "expired" || s === "cancelled" },
] as const;

function MyQuotesPage() {
  const t = useCourierTerms();
  const { data: me } = useMyCourier();
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["courier-my-quotes", me?.id],
    enabled: !!me?.id,
    refetchInterval: 60000, refetchIntervalInBackground: false, refetchOnWindowFocus: false,
    queryFn: () => nestListCourierQuotes([]),
  });

  const counts = TABS.reduce<Record<string, number>>((acc, tb) => {
    acc[tb.key] = quotes.filter((q: any) => tb.match(q.status)).length;
    return acc;
  }, {});
  const activeTab = TABS.find((tb) => tb.key === tab)!;
  const visible = quotes.filter((q: any) => activeTab.match(q.status));

  return (
    <CourierShell title={t.quotesTitle} subtitle={t.quotesSub}>
      {/* Status tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1" dir="rtl">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === tb.key ? "bg-[#35AD29] text-white shadow-sm" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tb.label}
            <span className={`mr-2 rounded-full px-1.5 text-xs ${tab === tb.key ? "bg-white/20" : "bg-white"}`}>
              {counts[tb.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {isLoading && <div className="text-center py-12 text-slate-500">טוען...</div>}
        {!isLoading && visible.length === 0 && (
          <Card className="rounded-2xl"><CardContent className="py-14 text-center text-slate-500">
            <Inbox className="size-10 mx-auto mb-3 opacity-50" />
            {tab === "open" ? "אין הצעות שממתינות לתשובה כרגע"
              : tab === "won" ? `עדיין לא אושרה לך הצעה — כשלקוח יבחר בך, ${t.theJob} יעבור אוטומטית ל"פעילים"`
              : "אין הצעות שנסגרו"}
          </CardContent></Card>
        )}
        {visible.map((q: any) => {
          const j = q.jobs;
          const meta = STATUS_LABEL[q.status] ?? { label: q.status, cls: "bg-slate-100" };
          const canEdit = q.status === "pending" || q.status === "shortlisted";
          return (
            <Card key={q.id} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="text-end">
                    <div className="text-2xl font-extrabold text-[#35AD29]">{Number(q.price).toFixed(0)} ₪</div>
                    <Badge className={meta.cls + " mt-1"}>{meta.label}</Badge>
                  </div>
                  <div className="text-end">
                    <div className="font-bold text-slate-900">{j?.customer_name ?? "לקוח"}</div>
                    <div className="text-xs text-slate-400 font-mono">#{j?.job_number}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-end mb-3">
                  <div><MapPin className="inline size-3 ml-1" />איסוף: {j?.pickup_address ?? j?.pickup_area ?? "—"}</div>
                  <div><MapPin className="inline size-3 ml-1" />מסירה: {j?.dropoff_address ?? j?.dropoff_area ?? "—"}</div>
                  <div><Clock className="inline size-3 ml-1" />{j?.job_date ?? "—"} {j?.job_time ?? ""}</div>
                  <div>זמן הגעה: {q.estimated_arrival_minutes ?? "—"} דק׳</div>
                </div>
                {q.note && <div className="text-sm bg-slate-50 p-2 rounded-xl mb-3 text-end">{q.note}</div>}

                {q.status === "selected" && (
                  <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-800 text-end">
                    🎉 הלקוח בחר בך — {t.theJob} עבר ל״פעילים״ ואפשר להתחיל.
                  </div>
                )}
                {(q.status === "rejected" || q.status === "expired") && (
                  <div className="mb-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600 text-end">
                    {q.status === "expired"
                      ? "ההצעה פגה — הלקוח לא הגיב בזמן."
                      : `הלקוח בחר ${t.worker} אחר להצעה הזו.`}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setEditing({ jobId: j.id, jobNumber: j.job_number, quote: q })}>
                      <Pencil className="size-3" /> עדכן הצעה
                    </Button>
                  )}
                  {q.status === "selected" && (
                    <Button size="sm" className="bg-[#35AD29] hover:bg-[#2d9623] text-white" asChild>
                      <Link to="/courier/active"><Eye className="size-3" /> {t.activeJobs}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {editing && (
        <SubmitQuoteDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          jobId={editing.jobId}
          jobNumber={editing.jobNumber}
          existing={editing.quote}
        />
      )}
    </CourierShell>
  );
}
