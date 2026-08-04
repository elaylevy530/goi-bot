import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import {
  listThreads,
  createThread,
  deleteThread,
  getThreadMessages,
} from "@/lib/admin-assistant/threads.functions";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, Bot, Loader2, Send, Sparkles as SparkIcon, HelpCircle } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/admin-assistant/$threadId")({
  head: () => ({ meta: [{ title: "עוזר AI — Goi" }] }),
  component: AdminAssistantThread,
});

const SUGGESTIONS = [
  "כמה שליחים פעילים יש לי?",
  "תראה לי שליחים פעילים בחיפה",
  "כמה משלוחים פתוחים?",
  "תן לי סקירה כללית של המערכת",
];

function AdminAssistantThread() {
  const { threadId } = useParams({ from: "/_authenticated/admin-assistant/$threadId" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const getMsgsFn = useServerFn(getThreadMessages);

  const { data: threads = [] } = useQuery({
    queryKey: ["admin-chat-threads"],
    queryFn: () => listFn(),
  });

  const { data: initialMessages, isLoading: msgsLoading } = useQuery({
    queryKey: ["admin-chat-messages", threadId],
    queryFn: () => getMsgsFn({ data: { threadId } }),
  });

  const mappedInitial = useMemo<UIMessage[]>(() => {
    return (initialMessages ?? []).map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant" | "system",
      parts: (r.parts ?? []) as UIMessage["parts"],
    }));
  }, [initialMessages]);

  // Build transport with dynamic auth header (re-read per request so token refresh works)
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/admin-chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const tok = data.session?.access_token;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
      },
      body: { threadId },
    });
  }, [threadId]);

  const { messages, sendMessage, status, addToolResult, setMessages } = useChat({
    id: threadId,
    transport,
    onError: (e) => {
      console.error(e);
      toast.error("שגיאה: " + e.message);
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat-threads"] });
    },
  });

  // Hydrate messages from DB when thread changes (only once)
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (msgsLoading) return;
    if (hydratedRef.current === threadId) return;
    setMessages(mappedInitial);
    hydratedRef.current = threadId;
  }, [threadId, msgsLoading, mappedInitial, setMessages]);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["admin-chat-threads"] });
      navigate({ to: "/admin-assistant/$threadId", params: { threadId: t.id } });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["admin-chat-threads"] });
      if (id === threadId) {
        const remaining = threads.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          navigate({ to: "/admin-assistant/$threadId", params: { threadId: remaining[0].id } });
        } else {
          navigate({ to: "/admin-assistant" });
        }
      }
    },
  });

  return (
    <AdminLayout title="עוזר AI" subtitle="ג'וי — העוזר האישי שלך">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="flex-1 gap-2">
              <Plus className="size-4" /> שיחה חדשה
            </Button>
            <Button asChild variant="outline" size="icon" title="מדריך שימוש">
              <Link to="/admin-assistant/guide">
                <HelpCircle className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {threads.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center">אין שיחות</div>
            )}
            {threads.map((t) => {
              const active = t.id === threadId;
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-1 rounded-md text-sm ${
                    active ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <Link
                    to="/admin-assistant/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 min-w-0 px-2.5 py-2 text-right"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{t.title}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm(`למחוק את "${t.title}"?`)) deleteMut.mutate(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-destructive"
                    title="מחק"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col overflow-hidden">
          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 && !msgsLoading && (
                <ConversationEmptyState
                  icon={
                    <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground shadow-md">
                      <SparkIcon className="size-7" />
                    </div>
                  }
                  title="היי, אני ג'וי"
                  description="העוזר האישי שלך. שאל אותי כל דבר על המערכת — שליחים, עסקים, משלוחים, סטטיסטיקות, או בקש ממני לבצע פעולה."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 w-full max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          sendMessage({ text: s });
                        }}
                        className="text-right text-xs px-3 py-2.5 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </ConversationEmptyState>
              )}
              {messages.map((m) => (
                <Message from={m.role === "user" ? "user" : "assistant"} key={m.id}>
                  {m.role !== "user" && (
                    <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground self-start">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <MessageContent>
                    {m.parts.map((part, i) => {
                      if (part.type === "text") {
                        if (m.role === "user") {
                          return (
                            <div key={i} className="whitespace-pre-wrap text-right">
                              {part.text}
                            </div>
                          );
                        }
                        return <MessageResponse key={i}>{part.text}</MessageResponse>;
                      }
                      if (part.type.startsWith("tool-")) {
                        const toolPart = part as unknown as {
                          type: string;
                          state: "input-streaming" | "input-available" | "output-available" | "output-error";
                          input?: unknown;
                          output?: unknown;
                          errorText?: string;
                          toolCallId: string;
                        };
                        return (
                          <Tool key={i} defaultOpen={false} className="my-2 w-full">
                            <ToolHeader type={toolPart.type as `tool-${string}`} state={toolPart.state} />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              <ToolOutput output={renderToolOutput(toolPart)} errorText={toolPart.errorText} />
                            </ToolContent>
                          </Tool>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && (
                <Message from="assistant">
                  <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground self-start">
                    <Bot className="size-4" />
                  </div>
                  <MessageContent>
                    <Shimmer>ג'וי חושב...</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Pending approvals */}
          <PendingApprovals messages={messages} addToolResult={addToolResult} />

          <div className="border-t p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="שאל את ג'וי כל דבר על המערכת..."
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  status={isLoading ? "streaming" : undefined}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

function renderToolOutput(part: { type: string; state: string; output?: unknown }) {
  if (part.state !== "output-available") return null;
  const out = part.output as Record<string, unknown> | undefined;
  if (!out) return null;

  // Special: whatsapp links list
  if (part.type === "tool-send_whatsapp_to_couriers" && Array.isArray(out.links)) {
    const links = out.links as Array<{ name: string; phone: string; link: string }>;
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          {String(out.count)} שליחים — הודעה: "{String(out.message)}"
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {links.map((l) => (
            <a
              key={l.phone}
              href={l.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border bg-background hover:bg-[#25D366]/10 text-xs transition-colors"
            >
              <span className="truncate font-medium">{l.name}</span>
              <span className="text-muted-foreground font-mono shrink-0">{l.phone}</span>
              <span className="text-[#128C7E] shrink-0 font-semibold">פתח →</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Default: pretty JSON
  return (
    <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
      {JSON.stringify(out, null, 2)}
    </pre>
  );
}

function PendingApprovals({
  messages,
  addToolResult,
}: {
  messages: UIMessage[];
  addToolResult: (args: { tool: string; toolCallId: string; output: unknown }) => void;
}) {
  // Find tool calls that are awaiting input (state: input-available with needsApproval pattern)
  const pending = useMemo(() => {
    const out: Array<{ toolName: string; toolCallId: string; input: unknown }> = [];
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          const p = part as unknown as {
            type: string;
            state: string;
            input?: unknown;
            toolCallId: string;
          };
          if (p.state === "input-available") {
            const toolName = p.type.replace(/^tool-/, "");
            out.push({ toolName, toolCallId: p.toolCallId, input: p.input });
          }
        }
      }
    }
    return out;
  }, [messages]);

  if (pending.length === 0) return null;

  return (
    <div className="border-t bg-amber-50/60 px-3 py-2.5 space-y-2">
      {pending.map((p) => (
        <div key={p.toolCallId} className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <div className="font-semibold text-amber-900">דורש אישור: {p.toolName}</div>
            <div className="text-xs text-amber-800/80 truncate">{JSON.stringify(p.input)}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                addToolResult({
                  tool: p.toolName,
                  toolCallId: p.toolCallId,
                  output: { cancelled: true, message: "המנהל ביטל את הפעולה" },
                })
              }
            >
              דחה
            </Button>
            <Button
              size="sm"
              onClick={() =>
                addToolResult({
                  tool: p.toolName,
                  toolCallId: p.toolCallId,
                  output: { approved: true },
                })
              }
            >
              אשר ובצע
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
