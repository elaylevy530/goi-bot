import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  nestListTeamMembers, nestInviteTeamMember, nestUpdateTeamMemberRole, nestDeleteTeamMember,
} from "@/lib/nest-domain";
import { Users, Plus, Trash2, Shield, Send, Eye, UserCog, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./business.dashboard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/business/team")({
  head: () => ({ meta: [{ title: "צוות והרשאות — Goi עסקים" }] }),
  ssr: false,
  component: TeamPage,
});

type Role = "manager" | "dispatcher" | "viewer";
type TeamMember = {
  id: string;
  business_id: string;
  user_id: string | null;
  phone: string;
  name: string;
  role: Role;
  invited_at: string;
  accepted_at: string | null;
};

const ROLE_META: Record<Role, { label: string; desc: string; icon: typeof Shield; tone: string }> = {
  manager:    { label: "מנהל",     desc: "גישה מלאה — הזמנות, ארנק, צוות",     icon: Shield,  tone: "bg-[#101418] text-[#F5C518]" },
  dispatcher: { label: "משדר משלוחים", desc: "שידור וצפייה במשלוחים",              icon: Send,    tone: "bg-[#F5C518]/20 text-[#101418]" },
  viewer:     { label: "צופה בלבד", desc: "רק צפייה במשלוחים ובהיסטוריה",       icon: Eye,     tone: "bg-slate-100 text-slate-700" },
};

const emptyForm = { name: "", phone: "", role: "dispatcher" as Role };

function TeamPage() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListTeamMembers() as Promise<TeamMember[]>,
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל עסק");
      if (!form.name.trim() || !form.phone.trim()) throw new Error("נא למלא שם וטלפון");
      const phone = form.phone.replace(/\D/g, "");
      await nestInviteTeamMember({
        name: form.name.trim(),
        phone,
        role: form.role,
      });
    },
    onSuccess: () => {
      toast.success("חבר צוות הוזמן. שלח לו את כתובת ההתחברות של Goi.");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setOpen(false); setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      await nestUpdateTeamMemberRole(id, role);
    },
    onSuccess: () => { toast.success("התפקיד עודכן"); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await nestDeleteTeamMember(id); },
    onSuccess: () => { toast.success("הוסר"); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <BusinessShell title="צוות והרשאות" subtitle="חברי צוות שרשאים לגשת לפאנל שלך">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {/* Header CTA */}
        <button
          onClick={() => { setForm(emptyForm); setOpen(true); }}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#F5C518] text-[#101418] font-black shadow-[0_8px_24px_-8px_rgba(245,197,24,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(245,197,24,0.6)] transition"
        >
          <Plus className="size-5" /> הזמן חבר צוות חדש
        </button>

        {/* List */}
        <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">טוען...</div>
          ) : members.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="עדיין אין חברי צוות"
                desc="הזמן עובד או שותף כדי שיוכל לשדר משלוחים בשמך."
              />
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {members.map((m) => {
                const meta = ROLE_META[m.role];
                const RoleIcon = meta.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`size-11 rounded-2xl grid place-items-center shrink-0 ${meta.tone}`}>
                      <RoleIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-black text-[#101418] truncate">{m.name}</div>
                        {!m.accepted_at && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 shrink-0">
                            ממתין להצטרפות
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span dir="ltr">{m.phone}</span>
                        <span>·</span>
                        <span className="font-semibold">{meta.label}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="size-9 grid place-items-center rounded-xl hover:bg-black/5" aria-label="עוד">
                          <MoreVertical className="size-4 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {(Object.keys(ROLE_META) as Role[]).filter((r) => r !== m.role).map((r) => (
                          <DropdownMenuItem key={r} onClick={() => changeRole.mutate({ id: m.id, role: r })}>
                            <UserCog className="size-4" /> שנה ל{ROLE_META[r].label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => { if (confirm(`להסיר את ${m.name} מהצוות?`)) remove.mutate(m.id); }}
                        >
                          <Trash2 className="size-4" /> הסר מהצוות
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role legend */}
        <div className="rounded-2xl bg-white border border-black/5 p-4">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">תפקידים והרשאות</div>
          <div className="space-y-2.5">
            {(Object.keys(ROLE_META) as Role[]).map((r) => {
              const meta = ROLE_META[r];
              const Icon = meta.icon;
              return (
                <div key={r} className="flex items-start gap-3">
                  <div className={`size-9 rounded-xl grid place-items-center shrink-0 ${meta.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-[#101418]">{meta.label}</div>
                    <div className="text-[12px] text-slate-500">{meta.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">הזמנת חבר צוות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מלא</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם החבר בצוות"
                className="h-11 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="050-1234567"
                className="h-11 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>תפקיד</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_META) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col text-right">
                        <span className="font-bold">{ROLE_META[r].label}</span>
                        <span className="text-[11px] text-slate-500">{ROLE_META[r].desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3">
              לאחר ההזמנה — שלח לחבר הצוות קישור להתחברות. הוא ייכנס עם מספר הטלפון שלו וייחשב חלק מהצוות של העסק.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button
              onClick={() => invite.mutate()}
              disabled={invite.isPending}
              className="bg-[#F5C518] text-[#101418] hover:bg-[#E5B516] font-black"
            >
              {invite.isPending ? "מזמין..." : "שלח הזמנה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessShell>
  );
}
