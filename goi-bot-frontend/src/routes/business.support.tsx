import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Badge, Modal, Panel, SaveBar, SelectBox } from "@/components/business/goi/GoiUi";
import { nestCreateSupportTicket, nestListMySupportTickets } from "@/lib/nest-domain";
import { supportWhatsAppUrl } from "@/lib/support";
import { toast } from "sonner";

const ISSUE_TYPES = ["שליח לא הגיע", "איחור", "בעיה במסירה", "בעיה בתשלום", "שאלה כללית"];
const STATUS_HE: Record<string, string> = { open: "פתוח", in_progress: "בטיפול", resolved: "נפתר", closed: "סגור" };
const STATUS_TONE: Record<string, string> = { open: "amber", in_progress: "blue", resolved: "green", closed: "gray" };

export const Route = createFileRoute("/business/support")({
  head: () => ({ meta: [{ title: "תמיכה — Goi" }] }),
  ssr: false,
  component: SupportPage,
});

function SupportPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ issue_type: ISSUE_TYPES[0], message: "" });
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMySupportTickets(),
  });
  const submit = useMutation({
    mutationFn: async () => {
      await nestCreateSupportTicket({ issue_type: f.issue_type, message: f.message, job_id: null });
    },
    onSuccess: () => {
      toast.success("הקריאה נפתחה");
      setOpen(false);
      setF({ issue_type: ISSUE_TYPES[0], message: "" });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="עזרה ותמיכה" subtitle="קריאות תמיכה ופנייה לצוות" headerExtra={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn outline" href={supportWhatsAppUrl("שלום, אני צריך עזרה בפאנל העסקים של Goi")} target="_blank" rel="noreferrer">
          <MessageSquare size={16} /> וואטסאפ
        </a>
        <button type="button" className="btn primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> פתח קריאה
        </button>
      </div>
    }>
      <Panel title="הקריאות שלי">
        {tickets.length === 0 ? (
          <div className="empty-state">
            <p>אין קריאות פתוחות. אם נתקלת בבעיה — פתח קריאה ונחזור אליך.</p>
            <Link to="/business/help" className="btn outline">חזרה לשאלות נפוצות</Link>
          </div>
        ) : (
          <div className="support-topics" style={{ display: "grid", gap: 10 }}>
            {tickets.map((t: any) => (
              <article key={t.id} className="panel">
                <div className="panel-title">
                  <h2>{t.issue_type}</h2>
                  <Badge text={STATUS_HE[t.status] || t.status} tone={STATUS_TONE[t.status] || "gray"} />
                </div>
                <p>{t.message}</p>
                <small className="hint">{new Date(t.created_at).toLocaleString("he-IL")}</small>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <Modal open={open} onClose={() => setOpen(false)} title="פתח קריאת תמיכה">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (f.message.trim()) submit.mutate();
          }}
        >
          <label className="field">
            סוג הבעיה
            <SelectBox label="סוג הבעיה" value={f.issue_type} onChange={(v) => setF({ ...f, issue_type: v })} options={ISSUE_TYPES} />
          </label>
          <label className="field">
            תיאור
            <textarea required rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          </label>
          <SaveBar saving={submit.isPending} />
        </form>
      </Modal>
    </BusinessShell>
  );
}
