import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyChatThreadsFn, openSupportTicketFn } from "@/lib/customer-account.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bike, HeadphonesIcon, MessageCircle, Send, Loader2, ChevronLeft } from "lucide-react";
import { PushEnableRowGeneric } from "@/components/PushEnableRow";
import { pushSupported } from "@/lib/push/subscribe";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customer/chat")({
  head: () => ({ meta: [{ title: "צ׳אט — Goi" }] }),
  component: ChatListPage,
});

function ChatListPage() {
  const getThreads = useServerFn(getMyChatThreadsFn);
  const openTicket = useServerFn(openSupportTicketFn);
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["my-chat-threads"],
    queryFn: () => getThreads(),
  });

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const sendSupport = useMutation({
    mutationFn: (msg: string) => openTicket({ data: { message: msg } }),
    onSuccess: () => {
      toast.success("הפנייה נקלטה — נחזור אליך בוואטסאפ");
      setSupportOpen(false);
      setSupportMsg("");
      qc.invalidateQueries({ queryKey: ["my-chat-threads"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שליחה נכשלה"),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5" />
        <h1 className="text-xl font-extrabold">צ׳אט</h1>
      </div>

      {userId && pushSupported() && (
        <PushEnableRowGeneric
          role="customer"
          ownerId={userId}
          copy={{
            title: "הפעל התראות להודעות מהמוביל",
            subtitle: "תדע מיד כשהמוביל יכתוב לך על ההזמנה",
            grantedTitle: "התראות פעילות",
            grantedSubtitle: "תקבל התראה מיידית על הודעות ועדכוני משלוח",
          }}
        />
      )}


      {/* Support entry */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogTrigger asChild>
          <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#101418] to-[#2a2f36] text-white ring-1 ring-black/5 active:scale-[0.99] transition">
            <div className="size-11 rounded-2xl bg-[#F5C518] text-[#101418] grid place-items-center shrink-0">
              <HeadphonesIcon className="size-5" />
            </div>
            <div className="flex-1 text-right">
              <div className="font-extrabold">תמיכה של Goi</div>
              <div className="text-xs text-white/70">שאל אותנו כל דבר — עונים תוך רגעים</div>
            </div>
            <ChevronLeft className="size-4 text-white/60" />
          </button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>שליחת פנייה לתמיכה</DialogTitle>
            <DialogDescription>הפנייה תגיע לצוות שלנו ונחזור אליך בוואטסאפ.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={supportMsg}
            onChange={(e) => setSupportMsg(e.target.value)}
            rows={5}
            maxLength={1000}
            placeholder="במה נוכל לעזור?"
            className="resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setSupportOpen(false)}>ביטול</Button>
            <Button
              onClick={() => sendSupport.mutate(supportMsg.trim())}
              disabled={sendSupport.isPending || supportMsg.trim().length < 2}
              className="bg-[#F5C518] hover:bg-[#e6b70a] text-[#101418]"
            >
              {sendSupport.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              שלח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threads */}
      <section>
        <div className="text-xs font-bold text-[#101418]/50 uppercase tracking-widest mb-2">שיחות עם מובילים</div>
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#101418]/50 ring-1 ring-black/5">טוען…</div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
            <div className="size-14 rounded-full bg-black/5 mx-auto grid place-items-center mb-3">
              <MessageCircle className="size-6 text-[#101418]/40" />
            </div>
            <div className="text-sm text-[#101418]/60">אין שיחות עם מובילים עדיין</div>
            <div className="text-xs text-[#101418]/40 mt-1">שיחות ייפתחו אוטומטית כשמשובץ מוביל להזמנה</div>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t: any) => (
              <Link
                key={t.id}
                to="/customer/chat/$jobId"
                params={{ jobId: t.id }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-black/5 hover:ring-black/15 transition"
              >
                <div className="size-11 rounded-full bg-[#F5C518]/15 text-[#8A6100] grid place-items-center shrink-0">
                  <Bike className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{t.couriers?.full_name ?? "מוביל"}</span>
                    <span className="text-[11px] text-[#101418]/50">#{t.job_number}</span>
                  </div>
                  <div className="text-xs text-[#101418]/60 truncate mt-0.5">
                    {t.pickup_address} ← {t.dropoff_address}
                  </div>
                </div>
                <ChevronLeft className="size-4 text-[#101418]/40 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
