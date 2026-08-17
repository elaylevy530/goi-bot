import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyChatMessagesFn, sendCourierMessageFn } from "@/lib/customer-account.functions";
import { ArrowRight, Bike, Loader2, Phone, Send, FileText, Download, Image as ImageIcon, Video, Music, Lock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/chat/$jobId")({
  head: () => ({ meta: [{ title: "שיחה עם המוביל — Goi" }] }),
  component: ChatThreadPage,
});

type ChatMessage = {
  id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_kind: "image" | "audio" | "video" | "file" | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | string | null;
  duration_ms: number | null;
  created_at: string;
  direction: "inbound" | "outbound";
};

function MessageContent({ message }: { message: ChatMessage }) {
  // Display attachment if present
  if (message.attachment_url) {
    const attachmentUrl = message.attachment_url;
    
    if (message.attachment_kind === "image") {
      return (
        <div className="space-y-1">
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={attachmentUrl}
              alt={message.attachment_name || "תמונה"}
              className="max-w-full rounded-lg max-h-64 object-cover"
            />
          </a>
          {message.body && <div className="whitespace-pre-wrap mt-2">{message.body}</div>}
        </div>
      );
    }
    
    if (message.attachment_kind === "audio") {
      const durationSec = message.duration_ms ? Math.round(message.duration_ms / 1000) : null;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="size-4 shrink-0" />
            <span className="text-xs font-medium">{message.attachment_name || "הודעה קולית"}</span>
            {durationSec && <span className="text-xs opacity-60">({durationSec}s)</span>}
          </div>
          <audio controls className="w-full max-w-xs" src={attachmentUrl}>
            הדפדפן שלך לא תומך בהשמעת אודיו
          </audio>
          {message.body && <div className="whitespace-pre-wrap mt-2">{message.body}</div>}
        </div>
      );
    }
    
    if (message.attachment_kind === "video") {
      return (
        <div className="space-y-1">
          <video controls className="max-w-full rounded-lg max-h-64" src={attachmentUrl}>
            הדפדפן שלך לא תומך בהשמעת וידאו
          </video>
          {message.body && <div className="whitespace-pre-wrap mt-2">{message.body}</div>}
        </div>
      );
    }
    
    // Generic file attachment
    return (
      <div className="space-y-2">
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition"
        >
          <FileText className="size-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{message.attachment_name || "קובץ"}</div>
            {message.attachment_size && (
              <div className="text-[10px] opacity-60">
                {formatFileSize(message.attachment_size)}
              </div>
            )}
          </div>
          <Download className="size-3 shrink-0" />
        </a>
        {message.body && <div className="whitespace-pre-wrap">{message.body}</div>}
      </div>
    );
  }
  
  // Text-only message
  return <div className="whitespace-pre-wrap">{message.body}</div>;
}

function formatFileSize(size: number | string): string {
  const bytes = typeof size === "string" ? parseInt(size, 10) : size;
  if (isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatThreadPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getMessages = useServerFn(getMyChatMessagesFn);
  const sendMsg = useServerFn(sendCourierMessageFn);

  // Track if page is visible (for smart polling)
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-thread", jobId],
    queryFn: () => getMessages({ data: { job_id: jobId } }),
    // Smart polling: only poll when chat is active, visible, and not locked
    refetchInterval: (query) => {
      const jobData = query.state.data as typeof data;
      if (!jobData?.job) return false;
      
      // Stop polling if page is not visible (tab is in background)
      if (!isPageVisible) return false;
      
      // Stop polling if chat is locked (completed or cancelled)
      const isChatLocked = jobData.job.status === "הושלמה" || jobData.job.status === "בוטלה";
      if (isChatLocked) return false;
      
      // Poll every 5 seconds when active and visible
      return 5_000;
    },
    // Refetch when user returns to the tab
    refetchOnWindowFocus: true,
    // Refetch when user reconnects
    refetchOnReconnect: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    const messagesLength = data?.messages?.length ?? 0;
    const isNewMessage = messagesLength > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messagesLength;
    
    if (isNewMessage) {
      // Check if user is already near the bottom (within 100px)
      const isNearBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      // Only auto-scroll if user was already at the bottom or if it's the first load
      if (isNearBottom || prevMessagesLengthRef.current === messagesLength) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [data?.messages?.length]);

  const send = useMutation({
    mutationFn: (m: string) => sendMsg({ data: { job_id: jobId, message: m } }),
    onSuccess: async () => {
      setText("");
      // Immediately refetch messages after sending (don't wait for polling)
      await qc.refetchQueries({ queryKey: ["chat-thread", jobId] });
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
  
  // Check if chat is locked (job completed or cancelled)
  const isChatLocked = job.status === "הושלמה" || job.status === "בוטלה";
  const isCompleted = job.status === "הושלמה";
  const isCancelled = job.status === "בוטלה";

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

      {/* Locked Chat Banner */}
      {isChatLocked && (
        <div className="bg-white border-b border-black/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className={`size-10 rounded-full grid place-items-center shrink-0 ${
              isCompleted ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            }`}>
              {isCompleted ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#101418]">
                {isCompleted ? "המשלוח הושלם בהצלחה" : "המשלוח בוטל"}
              </div>
              <div className="text-xs text-[#101418]/60 mt-0.5">
                {isCompleted 
                  ? "השיחה עם המוביל הסתיימה. לא ניתן לשלוח הודעות נוספות."
                  : "השיחה נסגרה כי ההזמנה בוטלה. לא ניתן לשלוח הודעות נוספות."}
              </div>
            </div>
            <Lock className="size-4 text-[#101418]/40 shrink-0" />
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-[#101418]/50 pt-6">
            עוד לא נשלחו הודעות בשיחה זו.<br />שלח את הראשונה למטה 👇
          </div>
        ) : messages.map((m: ChatMessage) => {
          const mine = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                mine ? "bg-[#F5C518] text-[#101418] rounded-br-md" : "bg-white text-[#101418] ring-1 ring-black/5 rounded-bl-md"
              }`}>
                <MessageContent message={m} />
                <div className={`text-[10px] mt-1 ${mine ? "text-[#101418]/60" : "text-[#101418]/40"}`}>
                  {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      {isChatLocked ? (
        <div className="bg-white border-t border-black/5 p-4">
          <div className="flex items-center justify-center gap-2 text-sm text-[#101418]/50">
            <Lock className="size-4" />
            <span>לא ניתן לשלוח הודעות נוספות</span>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
