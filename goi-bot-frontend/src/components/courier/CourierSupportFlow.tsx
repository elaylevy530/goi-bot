import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  ChevronLeft,
  Heart,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { ChatCenter } from "@/components/ChatCenter";
import { CourierShell } from "@/components/CourierShell";
import {
  SUPPORT_COMPOSE_TOPICS,
  SUPPORT_HELP_CATEGORIES,
  SUPPORT_HELP_FAQ,
} from "@/lib/courier-support-help";
import { cn } from "@/lib/utils";
import { nestListConversations, nestOpenConversation, nestPostMessage } from "@/lib/nest-chat";

type SupportSearch = { c?: string; chat?: boolean };

export function CourierSupportFlow({ search }: { search: SupportSearch }) {
  const navigate = useNavigate();
  const inThread = Boolean(search.c);
  const inCompose = Boolean(search.chat) && !inThread;

  if (inThread) {
    return (
      <CourierShell title="צ׳אט תמיכה" subtitle="">
        <ChatCenter viewerRole="courier" inbox="support" initialConversationId={search.c} />
      </CourierShell>
    );
  }

  if (inCompose) {
    return <SupportCompose onBack={() => void navigate({ to: "/courier/support" })} />;
  }

  return <SupportHub />;
}

function SupportHub() {
  const [query, setQuery] = useState("");
  const [faqOpen, setFaqOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORT_HELP_CATEGORIES;
    return SUPPORT_HELP_CATEGORIES.filter((c) => `${c.label} ${c.hint}`.includes(q));
  }, [query]);

  const closeHelp = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else void navigate({ to: "/courier/new-jobs" });
  };

  return (
    <CourierShell fullBleed>
      <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-y-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={closeHelp}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-text-strong"
              aria-label="סגירה"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 text-center">
              <div className="font-wordmark text-xl font-black tracking-tight text-text-strong">GOI</div>
              <div className="text-[11px] font-semibold text-text-muted">תמיכה לשליחים</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-bold text-success-text">
              <Bike className="size-3.5" />
              שליח
            </span>
          </header>

          <div className="relative overflow-hidden rounded-2xl bg-courier-hero">
            <img
              src="/courier/share-hero.png"
              alt=""
              className="h-44 w-full object-cover object-top sm:h-52"
            />
          </div>

          <Link
            to="/courier/support"
            search={{ chat: true }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-pill border border-primary bg-primary-soft px-4 text-sm font-bold text-success-text"
          >
            אפשר לדבר איתנו בצ׳אט
            <MessageCircle className="size-4" />
          </Link>

          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש עזרה"
              className="h-12 w-full rounded-card border border-border bg-surface pr-10 pl-3 text-sm text-text-strong outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {filtered.map((cat, i) => {
              const Icon = cat.icon;
              const isFaq = cat.id === "faq";
              return (
                <li key={cat.id} className={i > 0 ? "border-t border-border" : undefined}>
                  {isFaq ? (
                    <button
                      type="button"
                      onClick={() => setFaqOpen((open) => !open)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-start"
                    >
                      <Icon className="size-5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 text-sm font-bold text-text-strong">{cat.label}</span>
                      <ChevronLeft className={cn("size-4 text-text-muted transition-transform", faqOpen && "-rotate-90")} />
                    </button>
                  ) : (
                    <Link
                      to="/courier/support"
                      search={{ chat: true }}
                      className="flex items-center gap-3 px-4 py-3.5"
                    >
                      <Icon className="size-5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 text-start text-sm font-bold text-text-strong">{cat.label}</span>
                      <ChevronLeft className="size-4 text-text-muted" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {faqOpen && (
            <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
              {SUPPORT_HELP_FAQ.map((item) => (
                <div key={item.q} className="text-start">
                  <div className="text-sm font-bold text-text-strong">{item.q}</div>
                  <p className="mt-0.5 text-sm text-text-subtle">{item.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CourierShell>
  );
}

function SupportCompose({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sending, setSending] = useState<string | null>(null);

  const { data: convId } = useQuery({
    queryKey: ["courier-support-conversation"],
    queryFn: async () => {
      const rows = await nestListConversations();
      const existing = rows.find((c) => c.kind === "courier_support");
      if (existing) return existing.id;
      const opened = await nestOpenConversation({ kind: "courier_support" });
      return opened.id;
    },
  });

  useEffect(() => {
    if (convId) qc.invalidateQueries({ queryKey: ["chat-conversations"] });
  }, [convId, qc]);

  const openThread = async (message?: string) => {
    if (!convId) return;
    setSending(message ?? "__open");
    try {
      if (message) await nestPostMessage(convId, { body: message });
      await navigate({ to: "/courier/support", search: { c: convId } });
    } finally {
      setSending(null);
    }
  };

  return (
    <CourierShell fullBleed>
      <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-y-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col gap-5">
          <header className="flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={onBack}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-text-strong"
              aria-label="חזרה"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 text-center">
              <div className="font-wordmark text-xl font-black tracking-tight text-text-strong">GOI</div>
              <div className="text-[11px] font-semibold text-text-muted">תמיכה לשליחים</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-bold text-success-text">
              <Bike className="size-3.5" />
              שליח
            </span>
          </header>

          <div className="flex items-center gap-3 px-1">
            <img
              src="/courier/share-hero.png"
              alt=""
              className="size-24 shrink-0 rounded-full object-cover object-[center_15%] ring-4 ring-primary-soft"
            />
            <div className="min-w-0 flex-1 text-end">
              <h1 className="text-2xl font-extrabold leading-tight text-text-strong">
                היי!
                <span className="ms-1" aria-hidden>👋</span>
                <br />
                איך נוכל לעזור?
              </h1>
              <p className="mt-1 text-sm text-text-subtle">צוות GOI כאן בשבילך. בחרו נושא או כתבו לנו הודעה</p>
            </div>
          </div>

          <div className="rounded-2xl bg-muted px-4 py-3 text-start text-sm leading-relaxed text-text">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-success-text">
              <Heart className="size-4 fill-current" />
              איזה כיף שהגעת אלינו!
            </div>
            כדי שנוכל לתת את המענה המדויק ביותר, אנא בחרו בנושא או כתבו את פנייתכם.
            <div className="mt-2 text-xs text-text-muted">GOI · תמיכה לשליחים · נגיב בהקדם</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SUPPORT_COMPOSE_TOPICS.map((topic) => {
              const Icon = topic.icon;
              const busy = sending === topic.message;
              return (
                <button
                  key={topic.id}
                  type="button"
                  disabled={!convId || Boolean(sending)}
                  onClick={() => void openThread(topic.message)}
                  className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-3 py-3 text-start shadow-card disabled:opacity-50"
                >
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 text-sm font-bold text-text-strong">{busy ? "שולח…" : topic.label}</span>
                  <ChevronLeft className="size-4 shrink-0 text-text-muted" />
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-3 pb-2">
            <button
              type="button"
              disabled={!convId || Boolean(sending)}
              onClick={() => void openThread()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-pill border border-primary bg-primary-soft px-4 text-sm font-bold text-success-text disabled:opacity-50"
            >
              <MessageCircle className="size-4" />
              כתבו לנו הודעה
            </button>
          </div>
        </div>
      </div>
    </CourierShell>
  );
}
