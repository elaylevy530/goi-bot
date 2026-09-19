import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CircleHelp,
  MessageSquare,
  Package,
  Settings,
  Wallet,
} from "lucide-react";

export type SupportStatus = "new" | "bot" | "agent" | "closed";

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  new: "חדש",
  bot: "בטיפול בוט",
  agent: "בטיפול נציג",
  closed: "נסגר",
};

export function resolveSupportStatus(
  raw: string | null | undefined,
  subject: string | null | undefined,
): SupportStatus {
  if (raw === "new" || raw === "bot" || raw === "agent" || raw === "closed") return raw;
  if (subject === "human") return "agent";
  return "bot";
}

export type HelpTopic = {
  id: string;
  label: string;
  message: string;
  icon: LucideIcon;
};

export const SUPPORT_COMPOSE_TOPICS: HelpTopic[] = [
  { id: "job", label: "בעיה בהזמנה", message: "בעיה בהזמנה", icon: Package },
  { id: "pay", label: "תשלום וארנק", message: "תשלום וארנק", icon: Wallet },
  { id: "app", label: "אפליקציה וטכניות", message: "אפליקציה וטכניות", icon: Settings },
  { id: "other", label: "נושא אחר", message: "נושא אחר", icon: MessageSquare },
];

export type HelpCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export const SUPPORT_HELP_CATEGORIES: HelpCategory[] = [
  { id: "jobs", label: "עבודות ומשלוחים", icon: Package, hint: "סטטוס, איסוף, דילוג וכתובות" },
  { id: "pay", label: "תשלום וארנק", icon: Wallet, hint: "תשלום, משיכה ועמלות" },
  { id: "app", label: "אפליקציה וטכניות", icon: Settings, hint: "מיקום, מפה והתראות" },
  { id: "policy", label: "כללים ומדיניות", icon: BookOpen, hint: "תנאי שימוש וכללי חשבון" },
  { id: "faq", label: "שאלות נפוצות", icon: CircleHelp, hint: "תשובות קצרות לשאלות נפוצות" },
];

export const SUPPORT_HELP_FAQ: { q: string; a: string }[] = [
  {
    q: "מתי נכנס תשלום לארנק?",
    a: "אחרי מסירה מוצלחת. פירוט מופיע במסך הארנק לפי משלוח.",
  },
  {
    q: "למה לא רואים משלוחים חדשים?",
    a: "בדקו שאתם פעילים ומקבלים עבודות, שהמיקום דולק, ושאתם בתוך אזור העבודה.",
  },
  {
    q: "איך מדברים עם נציג?",
    a: "במסך הצ׳אט אפשר לבחור נושא או לכתוב הודעה. אם צריך אדם — לחצו «נציג אנושי».",
  },
];
