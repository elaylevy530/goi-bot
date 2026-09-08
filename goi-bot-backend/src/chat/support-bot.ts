export const SUPPORT_HANDOFF_SUBJECT = "human";

export const SUPPORT_WELCOME =
  "היי, כאן בוט התמיכה של Goi.\nבחרו נושא למטה ואענה מיד. אם זה לא פותר — לחצו «נציג אנושי».";

const REPLIES = {
  pay: `תשלום וארנק:
• תשלום על משלוח נכנס לארנק אחרי מסירה.
• משיכה אפשרית לחודש שנסגר, לפי הכללים במסך הארנק.
• אם משיכה נדחתה או נתקעת — בקשו נציג אנושי עם מספר המשלוח.`,
  job: `משלוח פעיל:
• סטטוס המשלוח מתעדכן ממסך «משלוחים פעילים».
• דילוג הוא רק על אותו משלוח, לא על העסק.
• בעיה בכתובת או באיסוף — כתבו לעסק בצ׳אט העסקים, או בקשו נציג אם זה תקלה במערכת.`,
  app: `אפליקציה ומיקום:
• ודאו שהמיקום דולק בהגדרות המכשיר, ושאפשרתם ל-Goi גישה.
• אם המפה לא נטענת — סגרו את האפליקציה ופתחו מחדש, או בדקו רשת.
• התראות: במסך הבית אפשר להפעיל פוש אחרי התקנה.`,
  account: `החשבון:
• שינוי מספר טלפון נעשה דרך נציג.
• סטטוס «ממתין לאישור» או השהיה — נציג יבדוק את החשבון.
• סיסמה: מתוך מסך ההתחברות אפשר לאפס.`,
  human: `מעביר אתכם לנציג אנושי.\nהשיחה נשמרת כאן — נציג יחזור אליכם בהקדם.`,
  fallback: `לא זיהיתי את הנושא.\nבחרו אחד מהכפתורים למטה, או לחצו «נציג אנושי» אם צריך עזרה אישית.`,
} as const;

export type SupportBotResult = {
  reply: string;
  handoff: boolean;
};

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

export function replyToSupport(body: string | null | undefined): SupportBotResult {
  const text = String(body ?? "").trim().toLowerCase();
  if (!text) return { reply: REPLIES.fallback, handoff: false };

  if (
    includesAny(text, ["נציג", "אנושי", "אדם", "מנהל", "תדברו איתי", "human"]) ||
    text === "נציג אנושי"
  ) {
    return { reply: REPLIES.human, handoff: true };
  }
  if (includesAny(text, ["תשלום", "ארנק", "משיכ", "עמלה", "כסף", "paypal", "משכור"])) {
    return { reply: REPLIES.pay, handoff: false };
  }
  if (includesAny(text, ["משלוח", "עבוד", "איסוף", "מסיר", "דילג", "דלג", "הזמנ"])) {
    return { reply: REPLIES.job, handoff: false };
  }
  if (includesAny(text, ["אפליקצ", "מיקום", "gps", "מפה", "התרא", "פוש", "נכשל"])) {
    return { reply: REPLIES.app, handoff: false };
  }
  if (includesAny(text, ["חשבון", "טלפון", "סיסמ", "פרופיל", "אישור", "מושהה", "חסום"])) {
    return { reply: REPLIES.account, handoff: false };
  }
  return { reply: REPLIES.fallback, handoff: false };
}

export function isSupportConversationKind(kind: string | null | undefined) {
  return kind === "courier_support" || kind === "business_support";
}
