import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import { listPartnersFn, upsertPartnerFn, deletePartnerFn, type PartnerRow } from "@/lib/partners.functions";
import { listGreenApiGroups, type GreenApiGroup } from "@/lib/whatsapp-dispatch-groups.functions";
import {
  SECTION_DEFS,
  DEFAULT_SECTIONS,
  normalizeSections,
  buildJobMessage,
  type SectionKey,
} from "@/lib/whatsapp/job-message-template";
import { getPartnerLastJobFn } from "@/lib/partners.functions";
import { Copy, Plus, Trash2, Save, ExternalLink, RefreshCw, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partners")({
  head: () => ({ meta: [{ title: "שותפים — פאנלי הזמנות | Goi" }] }),
  component: PartnersPage,
});

const EMPTY: PartnerRow = {
  id: "",
  slug: "",
  name: "",
  logo_url: null,
  contact_phone: null,
  whatsapp_group_id: null,
  dispatch_note: null,
  is_active: true,
  message_sections: null,
  message_cta: null,
};

function PartnersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPartnersFn);
  const upsert = useServerFn(upsertPartnerFn);
  const remove = useServerFn(deletePartnerFn);

  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: () => list({}),
  });

  const [draft, setDraft] = useState<PartnerRow | null>(null);

  const save = useMutation({
    mutationFn: (row: PartnerRow) =>
      upsert({
        data: {
          id: row.id || null,
          slug: row.slug.trim(),
          name: row.name.trim(),
          logo_url: row.logo_url,
          contact_phone: row.contact_phone,
          whatsapp_group_id: row.whatsapp_group_id,
          dispatch_note: row.dispatch_note,
          is_active: row.is_active,
          message_sections: row.message_sections ?? null,
          message_cta: row.message_cta ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("נשמר");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה בשמירה"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה במחיקה"),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "https://goi-bot.lovable.app";

  return (
    <AdminLayout title="שותפים" subtitle="פאנלי הזמנות פרטיים לשותפים — כל הזמנה משודרת לקבוצת הוואטסאפ.">
      <div className="max-w-4xl mx-auto p-4 space-y-4" dir="rtl">
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-2 rounded-full bg-[#101418] text-white px-4 py-2 text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> שותף חדש
        </button>

        {draft && <PartnerForm value={draft} onChange={setDraft} onSave={(row) => save.mutate(row)} onCancel={() => setDraft(null)} saving={save.isPending} />}

        {isLoading && <p className="text-sm text-muted-foreground">טוען…</p>}

        <div className="space-y-3">
          {(partners ?? []).map((p) => {
            const link = `${origin}/p/${p.slug}`;
            return (
              <div key={p.id} className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-black">{p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(לא פעיל)</span>}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDraft(p)} className="text-xs font-bold rounded-full px-3 py-1.5 ring-1 ring-border">עריכה</button>
                    <button onClick={() => del.mutate(p.id)} className="text-destructive p-1.5" aria-label="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <code className="flex-1 truncate rounded-lg bg-muted px-2 py-1.5">{link}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(link); toast.success("הלינק הועתק"); }}
                    className="inline-flex items-center gap-1 rounded-full ring-1 ring-border px-3 py-1.5 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" /> העתק
                  </button>
                  <a href={link} target="_blank" rel="noreferrer" className="p-1.5" aria-label="פתח">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

function PartnerForm({
  value, onChange, onSave, onCancel, saving,
}: {
  value: PartnerRow;
  onChange: (v: PartnerRow) => void;
  onSave: (row: PartnerRow) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const listGroups = useServerFn(listGreenApiGroups);
  const qc = useQueryClient();
  const groupsQ = useQuery({ queryKey: ["green-groups"], queryFn: () => listGroups() });
  const groups: GreenApiGroup[] = groupsQ.data?.groups ?? [];
  const [q, setQ] = useState("");
  const filtered = groups.filter((g) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return g.name.toLowerCase().includes(s) || g.chatId.toLowerCase().includes(s);
  });

  const field = (label: string, key: keyof PartnerRow, placeholder = "") => (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <input
        value={(value[key] as string) ?? ""}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none ring-1 ring-border"
      />
    </label>
  );

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {field("שם השותף", "name", "אלוף ההובלות")}
        {field("מזהה בלינק (אנגלית)", "slug", "aluf")}
        {field("טלפון ליצירת קשר", "contact_phone", "050-0000000")}
        {field("לוגו (URL)", "logo_url", "https://…")}
        {field("הערה בהודעה למובילים", "dispatch_note", "")}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-muted-foreground">
            קבוצת וואטסאפ לשידור הזמנות מהפאנל הזה
          </span>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["green-groups"] })}
            disabled={groupsQ.isFetching}
            className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full ring-1 ring-border px-2.5 py-1"
          >
            <RefreshCw className={`w-3 h-3 ${groupsQ.isFetching ? "animate-spin" : ""}`} /> רענן
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חפש קבוצה לפי שם…"
          className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none ring-1 ring-border"
        />

        {groupsQ.isLoading && <p className="text-xs text-muted-foreground">טוען קבוצות…</p>}
        {groupsQ.isError && (
          <p className="text-xs text-destructive">שגיאה בשליפת קבוצות: {String((groupsQ.error as any)?.message ?? "")}</p>
        )}
        {!groupsQ.isLoading && groups.length === 0 && (
          <p className="text-xs text-muted-foreground">
            לא נמצאו קבוצות. ודא שהמספר של וואטסאפ חבר בקבוצה ושנשלחה בה הודעה, ואז לחץ "רענן".
          </p>
        )}

        <div className="border border-border rounded-xl max-h-56 overflow-y-auto divide-y bg-background">
          <button
            type="button"
            onClick={() => onChange({ ...value, whatsapp_group_id: null })}
            className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${!value.whatsapp_group_id ? "bg-muted/60" : ""}`}
          >
            <span className="text-muted-foreground">— ברירת מחדל: קבוצת המובילים הכללית —</span>
            {!value.whatsapp_group_id && <Check className="w-4 h-4 text-primary" />}
          </button>
          {filtered.map((g) => {
            const active = g.chatId === value.whatsapp_group_id;
            return (
              <button
                key={g.chatId}
                type="button"
                onClick={() => onChange({ ...value, whatsapp_group_id: g.chatId })}
                className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2 ${active ? "bg-primary/10" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground" dir="ltr">{g.chatId}</div>
                </div>
                {active && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <MessageTemplateEditor value={value} onChange={onChange} onSave={onSave} saving={saving} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_active}
          onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
        />
        פעיל
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(value)}
          disabled={saving || !value.name.trim() || !value.slug.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-[#101418] text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> שמור
        </button>
        <button onClick={onCancel} className="rounded-full ring-1 ring-border px-4 py-2 text-sm font-bold">ביטול</button>
      </div>
    </div>
  );
}


function MessageTemplateEditor({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: PartnerRow;
  onChange: (v: PartnerRow) => void;
  onSave: (row: PartnerRow) => void;
  saving: boolean;
}) {
  const lastJob = useServerFn(getPartnerLastJobFn);
  const jobQ = useQuery({
    queryKey: ["partner-preview-job", value.id || "new"],
    queryFn: () => lastJob({ data: { partnerId: value.id || null } }),
  });

  const sections = normalizeSections(value.message_sections);
  const setSection = (key: SectionKey, on: boolean) =>
    onChange({ ...value, message_sections: { ...sections, [key]: on } });

  const job = jobQ.data ?? null;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://goi.app";
  const link = job?.short_code ? `${origin}/g/${job.short_code}` : "";

  const preview = job
    ? buildJobMessage(job, {
        sections,
        link,
        cta: value.message_cta,
        partnerNote: value.dispatch_note,
      })
    : "";

  return (
    <div className="rounded-2xl bg-muted/40 ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold">תבנית ההודעה לקבוצת הוואטסאפ</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, message_sections: { ...DEFAULT_SECTIONS } })}
            className="text-[11px] font-bold rounded-full ring-1 ring-border px-2.5 py-1"
          >
            איפוס
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-1.5">
        {SECTION_DEFS.map((def) => (
          <label
            key={def.key}
            className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ring-1 cursor-pointer ${
              sections[def.key] ? "bg-emerald-500/10 ring-emerald-500/40" : "bg-background ring-border"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={sections[def.key]}
              onChange={(e) => setSection(def.key, e.target.checked)}
            />
            <span className="min-w-0">
              <span className="font-bold block">{def.label}</span>
              <span className="block text-[11px] text-muted-foreground truncate">{def.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-bold text-muted-foreground">
          שורת קריאה לפעולה (אופציונלי — ריק = ברירת מחדל)
        </span>
        <input
          value={value.message_cta ?? ""}
          onChange={(e) => onChange({ ...value, message_cta: e.target.value })}
          placeholder="רוצה לקחת את ההובלה או להציע מחיר?"
          className="w-full rounded-xl bg-background px-3 py-2 text-sm outline-none ring-1 ring-border"
        />
      </label>

      <div className="space-y-1">
        <span className="text-xs font-bold text-muted-foreground">
          תצוגה מקדימה {job ? "(הזמנה אחרונה מהפאנל)" : ""}
        </span>
        {jobQ.isLoading ? (
          <p className="rounded-xl bg-muted px-3 py-4 text-sm text-muted-foreground">טוען הזמנה אחרונה…</p>
        ) : preview ? (
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-[#e7f7d8] text-[#0b1b12] p-3 text-[13px] leading-relaxed ring-1 ring-emerald-600/20">
{preview}
        </pre>
        ) : (
          <p className="rounded-xl bg-muted px-3 py-4 text-sm text-muted-foreground">
            אין הזמנה אחרונה לתצוגה. אחרי שתישלח הזמנה אמיתית — התבנית תופיע כאן.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            const row = { ...value, message_sections: { ...sections } };
            onChange(row);
            onSave(row);
          }}
          disabled={saving || !value.name.trim() || !value.slug.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-primary-deep text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "שומר…" : "שמור תבנית"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          השמירה מעדכנת מיד את ההודעה שנשלחת לקבוצה.
        </span>
      </div>
    </div>
  );
}
