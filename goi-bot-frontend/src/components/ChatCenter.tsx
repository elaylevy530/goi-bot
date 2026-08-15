import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  nestListConversationsEnriched,
  nestListMessages,
  nestMarkConversationRead,
  nestOpenConversation,
  nestPostMessage,
  type EnrichedConversation,
} from "@/lib/nest-chat";
import { nestSignedFileUrlResolved, nestUploadFile } from "@/lib/nest-files";
import { nestListJobs } from "@/lib/nest-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Paperclip, MessageSquare, Image as ImageIcon, ArrowRight, LifeBuoy, Plus, Briefcase, Mic, Square, FileText, X, Download, Search, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

type ViewerRole = "courier" | "business" | "admin";

type ConversationRow = EnrichedConversation;

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: "courier" | "business" | "admin" | "guest";
  body: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_kind: "image" | "audio" | "video" | "file" | null;
  duration_ms: number | null;
  created_at: string;
};

function detectKind(mime: string | null | undefined): "image" | "audio" | "video" | "file" {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatSize(b: number | null | undefined) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function titleFor(c: ConversationRow, viewer: ViewerRole) {
  if (c.kind === "courier_support") return viewer === "admin" ? `תמיכה · ${c.courier?.full_name ?? "שליח"}` : "תמיכת המערכת";
  if (c.kind === "business_support") return viewer === "admin" ? `תמיכה · ${c.business?.name ?? "עסק"}` : "תמיכת המערכת";
  if (c.kind === "guest_support") {
    const guest = c.job?.guest_name?.trim() || c.subject || "לקוח";
    const num = c.job?.job_number ? `#${c.job.job_number}` : null;
    return viewer === "admin"
      ? `הובלות · ${guest}${num ? ` · ${num}` : ""}`
      : "תמיכת GOI";
  }
  if (c.kind === "courier_business") {
    if (viewer === "courier") return c.business?.name ?? "בית העסק";
    if (viewer === "business") return c.courier?.full_name ?? "השליח";
    return `${c.courier?.full_name ?? "שליח"} ↔ ${c.business?.name ?? "עסק"}`;
  }
  return "שיחה";
}

function unreadFor(c: ConversationRow, viewer: ViewerRole) {
  return viewer === "courier" ? c.unread_courier : viewer === "business" ? c.unread_business : c.unread_admin;
}

function initialsOf(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

function shortTimeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { locale: he, addSuffix: false });
}

type AdminFilter = "all" | "courier_support" | "business_support" | "courier_business" | "guest_support" | "unread";
type CourierFilter = "all" | "support" | "customers";

export function ChatCenter({ viewerRole, initialConversationId }: { viewerRole: ViewerRole; initialConversationId?: string }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [mobileView, setMobileView] = useState<"list" | "thread">(initialConversationId ? "thread" : "list");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");
  const [courierFilter, setCourierFilter] = useState<CourierFilter>("all");
  const [search, setSearch] = useState("");

  // Sync when caller passes a new initial conversation id (e.g. opened from a deep link)
  useEffect(() => {
    if (initialConversationId) {
      setActiveId(initialConversationId);
      setMobileView("thread");
    }
  }, [initialConversationId]);


  // Load list
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["chat-conversations", viewerRole],
    queryFn: () => nestListConversationsEnriched(),
    refetchInterval: 4_000,
    refetchOnWindowFocus: false,
  });

  // Ensure support conversation exists for the current courier/business viewer
  useEffect(() => {
    if (viewerRole === "admin") return;
    if (isLoading) return;
    const hasSupport = conversations.some(
      (c) => (viewerRole === "courier" && c.kind === "courier_support") || (viewerRole === "business" && c.kind === "business_support"),
    );
    if (hasSupport) return;
    (async () => {
      try {
        await nestOpenConversation({
          kind: viewerRole === "courier" ? "courier_support" : "business_support",
        });
        qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
      } catch {
        // ignore — user may lack profile yet
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, isLoading, viewerRole]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // Poll Nest for new messages.
  useEffect(() => {
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [qc, viewerRole]);

  const activeConv = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (viewerRole === "admin") {
      if (adminFilter === "unread") list = list.filter((c) => c.unread_admin > 0);
      else if (adminFilter !== "all") list = list.filter((c) => c.kind === adminFilter);
    } else if (viewerRole === "courier") {
      if (courierFilter === "support") list = list.filter((c) => c.kind === "courier_support");
      else if (courierFilter === "customers") list = list.filter((c) => c.kind === "courier_business");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const t = titleFor(c, viewerRole).toLowerCase();
        const p = (c.last_message_preview ?? "").toLowerCase();
        return t.includes(q) || p.includes(q);
      });
    }
    return list;
  }, [conversations, adminFilter, courierFilter, search, viewerRole]);

  const adminCounts = useMemo(() => {
    if (viewerRole !== "admin") return null;
    return {
      all: conversations.length,
      courier_support: conversations.filter((c) => c.kind === "courier_support").length,
      business_support: conversations.filter((c) => c.kind === "business_support").length,
      courier_business: conversations.filter((c) => c.kind === "courier_business").length,
      guest_support: conversations.filter((c) => c.kind === "guest_support").length,
      unread: conversations.filter((c) => c.unread_admin > 0).length,
    };
  }, [conversations, viewerRole]);

  const courierCounts = useMemo(() => {
    if (viewerRole !== "courier") return null;
    const unreadOf = (list: ConversationRow[]) =>
      list.reduce((n, c) => n + (unreadFor(c, viewerRole) > 0 ? unreadFor(c, viewerRole) : 0), 0);
    const support = conversations.filter((c) => c.kind === "courier_support");
    const customers = conversations.filter((c) => c.kind === "courier_business");
    return {
      all: conversations.length,
      support: support.length,
      customers: customers.length,
      unreadAll: unreadOf(conversations),
      unreadSupport: unreadOf(support),
      unreadCustomers: unreadOf(customers),
    };
  }, [conversations, viewerRole]);


  const openConversation = async (args: {
    kind: "courier_support" | "business_support" | "courier_business" | "guest_support";
    courier_id?: string | null;
    business_id?: string | null;
    job_id?: string | null;
  }) => {
    try {
      const conv = await nestOpenConversation({
        kind: args.kind,
        courier_id: args.courier_id ?? undefined,
        business_id: args.business_id ?? undefined,
        job_id: args.job_id ?? undefined,
      });
      await qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
      const isExisting = conversations.some((c) => c.id === conv.id);
      setActiveId(conv.id);
      setMobileView("thread");
      toast.success(isExisting ? "השיחה נפתחה" : "שיחה חדשה נוצרה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פתיחת שיחה נכשלה");
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] gap-3 flex-1 min-h-0 md:min-h-[520px]">
      {/* List */}
      <aside className={`flex flex-col overflow-hidden ${mobileView === "thread" ? "hidden md:flex" : "flex"} ${
        viewerRole === "courier" ? "bg-transparent" : "bg-card border rounded-2xl"
      }`}>
        {viewerRole !== "courier" && (
          <div className="px-4 py-3 border-b font-bold flex items-center gap-2">
            <MessageSquare className="size-4" /> שיחות
            {viewerRole === "admin" && adminCounts && adminCounts.unread > 0 && (
              <Badge className="bg-primary text-primary-foreground mr-auto">{adminCounts.unread} חדשות</Badge>
            )}
          </div>
        )}

        {viewerRole === "courier" && courierCounts && (
          <div className="space-y-3 pb-3">
            <div className="flex items-center justify-end gap-3 px-1">
              <div className="min-w-0 text-right">
                <h1 className="text-xl font-extrabold text-text-strong leading-tight">הודעות</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  {courierCounts.unreadAll > 0 ? `${courierCounts.unreadAll} הודעות חדשות` : "הכל מעודכן"}
                </p>
              </div>
              <div className="size-11 rounded-card bg-primary text-primary-foreground grid place-items-center shadow-card shrink-0">
                <MessageSquare className="size-5" />
              </div>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש שיחה..."
                className="h-11 rounded-card border-border bg-surface pr-10 text-sm"
              />
            </div>

            <div className="flex w-full rounded-[14px] bg-muted p-1 shadow-card">
              {([
                ["all", "הכל", courierCounts.all, courierCounts.unreadAll],
                ["support", "תמיכה", courierCounts.support, courierCounts.unreadSupport],
                ["customers", "עסקים", courierCounts.customers, courierCounts.unreadCustomers],
              ] as const).map(([key, label, count, unread]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCourierFilter(key)}
                  className={`flex-1 min-h-11 rounded-[10px] px-1.5 py-2 text-sm text-center transition-all ${
                    courierFilter === key
                      ? "bg-surface font-bold text-text-strong shadow-card"
                      : "font-semibold text-text-subtle"
                  }`}
                >
                  {label} {count}
                  {unread > 0 && (
                    <span className="mr-1 inline-flex min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewerRole !== "admin" && (
          <StartChatPanel
            viewerRole={viewerRole}
            panelFilter={viewerRole === "courier" ? courierFilter : "all"}
            onStart={openConversation}
          />
        )}

        {viewerRole === "admin" && adminCounts && (
          <div className="border-b p-2 space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש בשיחות..."
              className="h-8 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {([
                ["all", "הכל", adminCounts.all],
                ["unread", "לא נקראו", adminCounts.unread],
                ["courier_support", "שליחים", adminCounts.courier_support],
                ["business_support", "עסקים", adminCounts.business_support],
                ["courier_business", "משלוחים", adminCounts.courier_business],
                ["guest_support", "הובלות", adminCounts.guest_support],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAdminFilter(key as AdminFilter)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    adminFilter === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {label} <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {viewerRole === "courier" && courierFilter === "customers"
                ? "אין שיחה עם בית עסק — תופיע כשתקבל משלוח"
                : conversations.length === 0 ? "אין שיחות עדיין" : "אין שיחות תואמות"}
            </div>
          ) : viewerRole === "courier" ? (
            <ul className="space-y-2 pb-2">
              {filteredConversations.map((c) => {
                const unread = unreadFor(c, viewerRole);
                const name = titleFor(c, viewerRole);
                const isSupport = c.kind === "courier_support";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => { setActiveId(c.id); setMobileView("thread"); }}
                      className={`w-full text-right rounded-card border border-border px-3 py-3 transition-colors ${
                        unread > 0 ? "bg-primary-soft/70" : "bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="size-11 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-extrabold">
                            {isSupport ? <LifeBuoy className="size-4" /> : initialsOf(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-text-muted shrink-0">{shortTimeAgo(c.last_message_at)}</span>
                            <div className="min-w-0 font-bold text-sm text-text-strong truncate">{name}</div>
                          </div>
                          <div className="mt-1 flex items-center justify-end">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-success-text">
                              {isSupport ? <LifeBuoy className="size-3" /> : <User className="size-3" />}
                              {isSupport ? "תמיכה" : "לקוח"}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm text-text-subtle truncate">{c.last_message_preview ?? "—"}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y">
              {filteredConversations.map((c) => {
                const unread = unreadFor(c, viewerRole);
                const active = c.id === activeId;
                const kindLabel =
                  c.kind === "courier_support" ? "תמיכה · שליח"
                  : c.kind === "business_support" ? "תמיכה · עסק"
                  : c.kind === "guest_support" ? "תמיכת לקוח · הובלות"
                  : "שליח ↔ עסק";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => { setActiveId(c.id); setMobileView("thread"); }}
                      className={`w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors ${active ? "bg-muted/70" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 min-w-0 font-semibold text-sm truncate">{titleFor(c, viewerRole)}</div>
                        {unread > 0 && <Badge className="bg-primary text-primary-foreground">{unread}</Badge>}
                      </div>
                      {viewerRole === "admin" && (
                        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <span>{kindLabel}</span>
                          {c.kind === "courier_business" && c.hidden_from_participants && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">הושלם</Badge>
                          )}
                        </div>
                      )}
                      {viewerRole === "admin" && c.kind === "guest_support" && c.job?.guest_phone ? (
                        <div className="text-[10px] text-muted-foreground mb-1 truncate">{c.job.guest_phone}</div>
                      ) : null}
                      <div className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(c.last_message_at), { locale: he, addSuffix: true })}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </aside>

      {/* Thread */}
      <section className={`bg-card border rounded-2xl flex flex-col overflow-hidden ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
        {activeConv ? (
          <Thread conv={activeConv} viewerRole={viewerRole} onBack={() => setMobileView("list")} />
        ) : (
          <div className="flex-1 grid place-items-center text-muted-foreground text-sm">בחר שיחה כדי להתחיל</div>
        )}
      </section>
    </div>
  );
}

function Thread({ conv, viewerRole, onBack }: { conv: ConversationRow; viewerRole: ViewerRole; onBack: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", conv.id],
    queryFn: () => nestListMessages(conv.id),
    refetchInterval: 4_000,
  });

  useEffect(() => {
    nestMarkConversationRead(conv.id)
      .then(() => qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] }))
      .catch(() => {});
  }, [conv.id, messages.length, viewerRole, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Signed URLs for attachments
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const todo = messages.filter((m) => m.attachment_url && !urls[m.id]);
    if (todo.length === 0) return;
    (async () => {
      const next: Record<string, string> = {};
      for (const m of todo) {
        try {
          const url = await nestSignedFileUrlResolved("chat-attachments", m.attachment_url!, "1h");
          next[m.id] = url;
        } catch {
          // skip broken attachment
        }
      }
      if (Object.keys(next).length) setUrls((p) => ({ ...p, ...next }));
    })();
  }, [messages, urls]);

  // Pending preview cleanup
  useEffect(() => {
    if (!pendingFile) { setPendingPreview(null); return; }
    if (pendingFile.type.startsWith("image/") || pendingFile.type.startsWith("audio/") || pendingFile.type.startsWith("video/")) {
      const u = URL.createObjectURL(pendingFile);
      setPendingPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPendingPreview(null);
  }, [pendingFile]);

  const send = useMutation({
    mutationFn: async ({ text, file, durationMs }: { text: string; file?: File | null; durationMs?: number | null }) => {
      let attachment_url: string | null = null;
      let attachment_mime: string | null = null;
      let attachment_name: string | null = null;
      let attachment_size: number | null = null;
      let attachment_kind: string | null = null;
      if (file) {
        const uploaded = await nestUploadFile("chat-attachments", file);
        attachment_url = uploaded.path;
        attachment_mime = file.type || uploaded.contentType;
        attachment_name = file.name;
        attachment_size = file.size;
        attachment_kind = detectKind(file.type);
      }
      await nestPostMessage(conv.id, {
        body: text || null,
        attachment_url,
        attachment_mime,
        attachment_name,
        attachment_size,
        attachment_kind,
        duration_ms: durationMs ?? null,
      });
    },
    onSuccess: () => {
      setBody("");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["chat-messages", conv.id] });
      qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recording) return;
    if (!body.trim() && !pendingFile) return;
    setSending(true);
    try { await send.mutateAsync({ text: body.trim(), file: pendingFile }); } finally { setSending(false); }
  };

  // === Voice recording ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recordChunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) recordChunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType || "audio/webm" });
        const durationMs = Date.now() - recordStartRef.current;
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: rec.mimeType || "audio/webm" });
        setRecording(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecordSec(0);
        setSending(true);
        try { await send.mutateAsync({ text: "", file, durationMs }); } finally { setSending(false); }
      };
      recorderRef.current = rec;
      recordStartRef.current = Date.now();
      rec.start();
      setRecording(true);
      setRecordSec(0);
      recordTimerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    } catch (err) {
      toast.error("אין גישה למיקרופון");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordSec(0);
  };

  const onPickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast.error("הקובץ גדול מ-25MB"); return; }
    setPendingFile(f);
  };

  const participantLocked = !!conv.hidden_from_participants && viewerRole !== "admin";

  return (
    <>
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="חזרה">
          <ArrowRight className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{titleFor(conv, viewerRole)}</div>
          {conv.kind === "courier_business" && conv.job && (
            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Briefcase className="size-3" />
              <span>משלוח · {conv.job.pickup_address ?? ""} ← {conv.job.dropoff_address ?? ""}</span>
            </div>
          )}
          {conv.kind === "guest_support" && conv.job && (
            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Briefcase className="size-3" />
              <span>
                {conv.job.job_number ? `#${conv.job.job_number} · ` : ""}
                {conv.job.pickup_address ?? ""} ← {conv.job.dropoff_address ?? ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">אין הודעות עדיין · שלחו את הראשונה</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === viewerRole;
          const url = m.attachment_url ? urls[m.id] : null;
          const kind = m.attachment_kind ?? detectKind(m.attachment_mime);
          const roleInitial =
            m.sender_role === "admin" ? "מ"
            : m.sender_role === "courier" ? "ש"
            : m.sender_role === "guest" ? "ל"
            : "ע";
          return (
            <div key={m.id} dir="ltr" className={`flex ${mine ? "flex-row-reverse" : "flex-row"} gap-2 items-end`}>
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-[10px]">{roleInitial}</AvatarFallback>
              </Avatar>
              <div dir="rtl" className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                {m.attachment_url && (
                  url ? (
                    kind === "image" ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt={m.attachment_name ?? "צרופה"} className="rounded-lg max-h-64 object-cover mb-1" />
                      </a>
                    ) : kind === "audio" ? (
                      <div className="mb-1 min-w-[200px]">
                        <audio src={url} controls className="w-full h-10" />
                        {m.duration_ms ? <div className="text-[10px] opacity-70 mt-0.5">{formatDuration(m.duration_ms)}</div> : null}
                      </div>
                    ) : kind === "video" ? (
                      <video src={url} controls className="rounded-lg max-h-64 mb-1" />
                    ) : (
                      <a href={url} target="_blank" rel="noreferrer" download={m.attachment_name ?? undefined}
                         className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2 ${mine ? "bg-primary-foreground/10" : "bg-muted"}`}>
                        <FileText className="size-5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{m.attachment_name ?? "קובץ"}</div>
                          <div className="text-[10px] opacity-70">{formatSize(m.attachment_size)}</div>
                        </div>
                        <Download className="size-4 opacity-70" />
                      </a>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs opacity-70 mb-1"><ImageIcon className="size-3" /> טוען...</div>
                  )
                )}
                {m.body && <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>}
                <div className={`text-[10px] mt-1 text-left ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex-1" />
            </div>
          );
        })}
      </div>

      {participantLocked && (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          השיחה הסתיימה עם מסירת המשלוח
        </div>
      )}

      {!participantLocked && pendingFile && (
        <div className="border-t bg-muted/40 p-2 flex items-center gap-2">
          {pendingFile.type.startsWith("image/") && pendingPreview ? (
            <img src={pendingPreview} alt="" className="size-12 rounded object-cover" />
          ) : pendingFile.type.startsWith("audio/") && pendingPreview ? (
            <audio src={pendingPreview} controls className="h-9 flex-1" />
          ) : pendingFile.type.startsWith("video/") && pendingPreview ? (
            <video src={pendingPreview} className="size-12 rounded object-cover" />
          ) : (
            <FileText className="size-8 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{pendingFile.name}</div>
            <div className="text-[10px] text-muted-foreground">{formatSize(pendingFile.size)}</div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setPendingFile(null)} aria-label="הסר">
            <X className="size-4" />
          </Button>
        </div>
      )}

      {!participantLocked && <form onSubmit={handleSubmit} className="border-t p-3 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          id={`file-${conv.id}`}
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
        {recording ? (
          <>
            <Button type="button" variant="ghost" size="icon" onClick={cancelRecording} aria-label="ביטול">
              <X className="size-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-red-700">{formatDuration(recordSec * 1000)}</span>
              <span className="text-xs text-red-700/70">מקליט הודעה קולית...</span>
            </div>
            <Button type="button" onClick={stopRecording} size="icon" className="bg-red-500 hover:bg-red-600 text-white" aria-label="עצור ושלח">
              <Square className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button asChild type="button" variant="ghost" size="icon" aria-label="צרופה">
              <label htmlFor={`file-${conv.id}`} className="cursor-pointer"><Paperclip className="size-4" /></label>
            </Button>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="הקלידו הודעה..."
              disabled={sending}
              className="flex-1"
            />
            {body.trim() || pendingFile ? (
              <Button type="submit" disabled={sending} size="icon" aria-label="שליחה">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            ) : (
              <Button type="button" onClick={startRecording} size="icon" variant="ghost" aria-label="הקלטה" disabled={sending}>
                <Mic className="size-4" />
              </Button>
            )}
          </>
        )}
      </form>}
    </>
  );
}

const ACTIVE_JOB_STATUSES = ["נבחר שליח", "פעילה"] as const;

type ActiveJob = {
  id: string;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  selected_courier_id: string | null;
  customer_id: string | null;
  customer_name?: string | null;
};

function StartChatPanel({
  viewerRole,
  panelFilter = "all",
  onStart,
}: {
  viewerRole: "courier" | "business";
  panelFilter?: "all" | "support" | "customers";
  onStart: (args: {
    kind: "courier_support" | "business_support" | "courier_business";
    courier_id?: string | null;
    business_id?: string | null;
    job_id?: string | null;
  }) => void | Promise<void>;
}) {
  const showSupport = panelFilter !== "customers";
  const showJobs = panelFilter !== "support";
  const { data: jobs = [] } = useQuery({
    queryKey: ["chat-start-active-jobs", viewerRole],
    queryFn: async () => {
      const rows = await nestListJobs({ limit: 50 });
      const active = new Set(ACTIVE_JOB_STATUSES as readonly string[]);
      return (rows ?? []).filter((j) => active.has(String(j.status ?? "")));
    },
    refetchInterval: 30_000,
  });

  return (
    <div className={`space-y-3 ${viewerRole === "courier" ? "pb-3" : "border-b bg-muted/20 p-3 space-y-2"}`}>
      {showSupport && (
        <button
          type="button"
          className={`w-full flex items-center gap-3 text-right transition-colors ${
            viewerRole === "courier"
              ? "rounded-card bg-primary text-primary-foreground px-4 py-3 shadow-card min-h-14"
              : "rounded-lg border border-border bg-surface px-3 py-2.5"
          }`}
          onClick={() => onStart({ kind: viewerRole === "courier" ? "courier_support" : "business_support" })}
        >
          {viewerRole === "courier" ? (
            <span className="size-8 grid place-items-center rounded-full bg-primary-foreground/15 shrink-0">
              <LifeBuoy className="size-4" />
            </span>
          ) : (
            <LifeBuoy className="size-4 text-primary" />
          )}
          <span className="flex-1 min-w-0">
            <span className={`block font-bold leading-tight ${viewerRole === "courier" ? "text-sm" : "text-sm"}`}>
              {viewerRole === "courier" ? "פנייה לתמיכת Goi" : "פנייה לתמיכה"}
            </span>
            {viewerRole === "courier" && (
              <span className="block text-xs text-primary-foreground/80 mt-0.5">שאלה, תקלה או עזרה – אנחנו כאן</span>
            )}
          </span>
          <Plus className={`size-5 shrink-0 ${viewerRole === "courier" ? "opacity-90" : "opacity-60"}`} />
        </button>
      )}

      {showJobs && (
      <div className={`font-bold px-1 pt-1 flex items-center justify-end gap-1.5 ${
        viewerRole === "courier" ? "text-sm text-text-strong" : "text-[11px] text-muted-foreground"
      }`}>
        {viewerRole === "courier" ? "משלוחים פעילים – צ'אט עם הלקוח" : "משלוחים פעילים — צ'אט עם השליח"}
        {viewerRole === "courier" && <Briefcase className="size-3.5 text-primary" />}
      </div>
      )}
      {showJobs && jobs.length === 0 ? (
        <div className={`text-center border border-dashed rounded-card ${
          viewerRole === "courier"
            ? "text-sm text-text-muted px-3 py-4 bg-surface"
            : "text-[11px] text-muted-foreground px-1 py-2 bg-card/50"
        }`}>
          אין משלוחים פעילים כרגע
        </div>
      ) : showJobs ? (
        <div className="space-y-1.5">
          {jobs.map((j) => {
            const partyName =
              viewerRole === "courier" ? j.customer_name ?? "בית העסק" : "השליח";
            return (
              <Button
                key={j.id}
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-auto py-2 text-right"
                onClick={() =>
                  onStart({
                    kind: "courier_business",
                    courier_id: j.selected_courier_id,
                    business_id: j.customer_id,
                    job_id: j.id,
                  })
                }
              >
                <Briefcase className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-sm font-semibold truncate">{partyName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {j.job_number ? `#${j.job_number} · ` : ""}{j.pickup_address ?? ""} ← {j.dropoff_address ?? ""}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


