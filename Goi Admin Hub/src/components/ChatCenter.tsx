import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Paperclip, MessageSquare, Image as ImageIcon, ArrowRight, LifeBuoy, Plus, Briefcase, Mic, Square, FileText, X, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

type ViewerRole = "courier" | "business" | "admin";

type ConversationRow = {
  id: string;
  kind: "courier_support" | "business_support" | "courier_business";
  courier_id: string | null;
  business_id: string | null;
  job_id: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_courier: number;
  unread_business: number;
  unread_admin: number;
  courier?: { full_name: string | null } | null;
  business?: { name: string | null } | null;
  job?: { id: string; pickup_address?: string | null; dropoff_address?: string | null } | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: "courier" | "business" | "admin";
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

type AdminFilter = "all" | "courier_support" | "business_support" | "courier_business" | "unread";

export function ChatCenter({ viewerRole, initialConversationId }: { viewerRole: ViewerRole; initialConversationId?: string }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [mobileView, setMobileView] = useState<"list" | "thread">(initialConversationId ? "thread" : "list");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id, kind, courier_id, business_id, job_id, subject,
          last_message_at, last_message_preview,
          unread_courier, unread_business, unread_admin,
          courier:couriers(full_name),
          business:customers(name),
          job:jobs(id, pickup_address, dropoff_address)
        `)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConversationRow[];
    },
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
      const { data, error } = await supabase.rpc("open_conversation", {
        _kind: viewerRole === "courier" ? "courier_support" : "business_support",
      });
      if (!error && data) {
        qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, isLoading, viewerRole]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // Realtime: refresh list and active thread on new messages / conversation updates
  useEffect(() => {
    const ch = supabase
      .channel("chat-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-messages"] });
        qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, viewerRole]);

  const activeConv = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (viewerRole === "admin") {
      if (adminFilter === "unread") list = list.filter((c) => c.unread_admin > 0);
      else if (adminFilter !== "all") list = list.filter((c) => c.kind === adminFilter);
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
  }, [conversations, adminFilter, search, viewerRole]);

  const adminCounts = useMemo(() => {
    if (viewerRole !== "admin") return null;
    return {
      all: conversations.length,
      courier_support: conversations.filter((c) => c.kind === "courier_support").length,
      business_support: conversations.filter((c) => c.kind === "business_support").length,
      courier_business: conversations.filter((c) => c.kind === "courier_business").length,
      unread: conversations.filter((c) => c.unread_admin > 0).length,
    };
  }, [conversations, viewerRole]);


  const openConversation = async (args: {
    kind: "courier_support" | "business_support" | "courier_business";
    courier_id?: string | null;
    business_id?: string | null;
    job_id?: string | null;
  }) => {
    const { data, error } = await supabase.rpc("open_conversation", {
      _kind: args.kind,
      _courier_id: args.courier_id ?? undefined,
      _business_id: args.business_id ?? undefined,
      _job_id: args.job_id ?? undefined,
    });
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] });
    if (typeof data === "string") {
      const isExisting = conversations.some((c) => c.id === data);
      setActiveId(data);
      setMobileView("thread");
      toast.success(isExisting ? "השיחה נפתחה" : "שיחה חדשה נוצרה");
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] gap-3 flex-1 min-h-0 md:min-h-[520px]">
      {/* List */}
      <aside className={`bg-card border rounded-2xl flex flex-col overflow-hidden ${mobileView === "thread" ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-3 border-b font-bold flex items-center gap-2">
          <MessageSquare className="size-4" /> שיחות
          {viewerRole === "admin" && adminCounts && adminCounts.unread > 0 && (
            <Badge className="bg-primary text-primary-foreground mr-auto">{adminCounts.unread} חדשות</Badge>
          )}
        </div>

        {viewerRole !== "admin" && (
          <StartChatPanel viewerRole={viewerRole} onStart={openConversation} />
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
              {conversations.length === 0 ? "אין שיחות עדיין" : "אין שיחות תואמות"}
            </div>
          ) : (
            <ul className="divide-y">
              {filteredConversations.map((c) => {
                const unread = unreadFor(c, viewerRole);
                const active = c.id === activeId;
                const kindLabel =
                  c.kind === "courier_support" ? "תמיכה · שליח"
                  : c.kind === "business_support" ? "תמיכה · עסק"
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
                        <div className="text-[10px] text-muted-foreground mb-1">{kindLabel}</div>
                      )}
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    supabase.rpc("mark_conversation_read", { _conversation_id: conv.id, _role: viewerRole })
      .then(() => qc.invalidateQueries({ queryKey: ["chat-conversations", viewerRole] }));
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
        const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(m.attachment_url!, 3600);
        if (data?.signedUrl) next[m.id] = data.signedUrl;
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
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("לא מחובר");
      let attachment_url: string | null = null;
      let attachment_mime: string | null = null;
      let attachment_name: string | null = null;
      let attachment_size: number | null = null;
      let attachment_kind: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${conv.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (up.error) throw up.error;
        attachment_url = path;
        attachment_mime = file.type || null;
        attachment_name = file.name;
        attachment_size = file.size;
        attachment_kind = detectKind(file.type);
      }
      const { error } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_user_id: u.user.id,
        sender_role: viewerRole,
        body: text || null,
        attachment_url,
        attachment_mime,
        attachment_name,
        attachment_size,
        attachment_kind,
        duration_ms: durationMs ?? null,
      });
      if (error) throw error;
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
          return (
            <div key={m.id} dir="ltr" className={`flex ${mine ? "flex-row-reverse" : "flex-row"} gap-2 items-end`}>
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-[10px]">{m.sender_role === "admin" ? "מ" : m.sender_role === "courier" ? "ש" : "ע"}</AvatarFallback>
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

      {pendingFile && (
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

      <form onSubmit={handleSubmit} className="border-t p-3 flex items-center gap-2">
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
      </form>
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
  couriers?: { id: string; full_name: string | null } | null;
  customers?: { id: string; name: string | null } | null;
};

function StartChatPanel({
  viewerRole,
  onStart,
}: {
  viewerRole: "courier" | "business";
  onStart: (args: {
    kind: "courier_support" | "business_support" | "courier_business";
    courier_id?: string | null;
    business_id?: string | null;
    job_id?: string | null;
  }) => void | Promise<void>;
}) {
  const { data: jobs = [] } = useQuery({
    queryKey: ["chat-start-active-jobs", viewerRole],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      let q = supabase
        .from("jobs")
        .select("id, job_number, pickup_address, dropoff_address, selected_courier_id, customer_id, couriers!jobs_selected_courier_id_fkey(id, full_name), customers(id, name)")
        .in("status", ACTIVE_JOB_STATUSES as unknown as never)
        .order("created_at", { ascending: false })
        .limit(20);
      if (viewerRole === "courier") {
        const { data: c } = await supabase.from("couriers").select("id").eq("user_id", u.user.id).maybeSingle();
        if (!c?.id) return [];
        q = q.eq("selected_courier_id", c.id);
      } else {
        const { data: b } = await supabase.from("customers").select("id").eq("user_id", u.user.id).maybeSingle();
        if (!b?.id) return [];
        q = q.eq("customer_id", b.id).not("selected_courier_id", "is", null);
      }
      const { data } = await q;
      return (data ?? []) as unknown as ActiveJob[];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="border-b bg-muted/20 p-3 space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 h-auto py-2.5"
        onClick={() => onStart({ kind: viewerRole === "courier" ? "courier_support" : "business_support" })}
      >
        <LifeBuoy className="size-4 text-primary" />
        <span className="flex-1 text-right font-semibold">פנייה לתמיכה</span>
        <Plus className="size-4 opacity-60" />
      </Button>

      <div className="text-[11px] font-bold text-muted-foreground px-1 pt-1">
        {viewerRole === "courier" ? "משלוחים פעילים — צ'אט עם בית העסק" : "משלוחים פעילים — צ'אט עם השליח"}
      </div>
      {jobs.length === 0 ? (
        <div className="text-[11px] text-muted-foreground px-1 py-2 bg-card/50 border border-dashed rounded-lg text-center">
          אין משלוחים פעילים כרגע
        </div>
      ) : (
        <div className="space-y-1.5">
          {jobs.map((j) => {
            const partyName =
              viewerRole === "courier" ? j.customers?.name ?? "בית העסק" : j.couriers?.full_name ?? "השליח";
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
      )}
    </div>
  );
}


