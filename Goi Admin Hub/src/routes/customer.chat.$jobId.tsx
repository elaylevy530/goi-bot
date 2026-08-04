import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyChatMessagesFn, sendCourierMessageFn } from "@/lib/customer-account.functions";
import { ArrowRight, Bike, Loader2, Phone, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/chat/$jobId")({
  head: () => ({ meta: [{ title: "שיחה עם המוביל — Goi" }] }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getMessages = useServerFn(getMyChatMessagesFn);
  const sendMsg = useServerFn(sendCourierMessageFn);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-thread", jobId],
    queryFn: () => getMessages({ data: { job_id: jobId } }),
    refetchInterval: 8000,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data?.messages?.length]);

  // realtime new messages
  useEffect(() => {
    const ch = supabase.channel(`chat-${jobId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages", filter: `job_id=eq.${jobId}` },
        () => qc.invalidateQueries({ queryKey: ["chat-thread", jobId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId, qc]);

  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: (m: string) => sendMsg({ data: { job_id: jobId, message: m } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat-thread", jobId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שליחה נכשלה"),
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-[#101418]/50">טוען שיחה…</div>;
  if (!data?.job) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-sm text-[#101418]/60">השיחה לא נמצאה.</div>
        <Link to="/customer/chat" className="text-sm font-bold text-[#0B5FCC]">חזרה לצ׳אט</Link>
      </div>
    );
  }

  const { job, courier, messages } = data;

  return (
    <div className="fixed inset-x-0 top-14 bottom-16 md:bottom-0 flex flex-col bg-[#f5f6f8]">
      {/* Header */}
      <div className="bg-white ring-1 ring-black/5 px-3 py-2.5 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/customer/chat" })}
          className="size-9 rounded-full grid place-items-center hover:bg-black/5 shrink-0"
          aria-label="חזרה"
        >
          <ArrowRight className="size-4" />
        </button>
        <div className="size-10 rounded-full bg-[#F5C518]/20 text-[#8A6100] grid place-items-center shrink-0">
          <Bike className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{courier?.full_name ?? "המוביל שלך"}</div>
          <Link
            to="/customer/order/$id" params={{ id: job.id }}
            className="text-[11px] text-[#101418]/50 hover:text-[#0B5FCC] truncate"
          >
            הזמנה #{job.job_number} · {job.status}
          </Link>
        </div>
        {courier?.whatsapp_phone && (
          <a
            href={`tel:${courier.whatsapp_phone}`}
            className="size-10 rounded-full bg-[#101418] text-white grid place-items-center shrink-0"
            aria-label="חיוג"
          >
            <Phone className="size-4" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-[#101418]/50 pt-6">
            עוד לא נשלחו הודעות בשיחה זו.<br />שלח את הראשונה למטה 👇
          </div>
        ) : messages.map((m: any) => {
          const mine = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                mine ? "bg-[#F5C518] text-[#101418] rounded-br-md" : "bg-white text-[#101418] ring-1 ring-black/5 rounded-bl-md"
              }`}>
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[10px] mt-1 ${mine ? "text-[#101418]/60" : "text-[#101418]/40"}`}>
                  {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}
        className="bg-white border-t border-black/5 p-2.5 flex items-end gap-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="כתוב הודעה למוביל…"
          rows={1}
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) send.mutate(text.trim());
            }
          }}
          className="flex-1 resize-none bg-[#f5f6f8] rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#F5C518] max-h-32"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          className="size-11 rounded-full bg-[#25D366] disabled:bg-black/10 disabled:text-[#101418]/30 text-white grid place-items-center shrink-0"
          aria-label="שלח"
        >
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
