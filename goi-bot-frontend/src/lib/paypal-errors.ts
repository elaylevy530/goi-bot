const ISSUE_HE: Record<string, string> = {
  INVALID_SECURITY_CODE: "קוד CVV שגוי. בדוק את 3 הספרות בגב הכרטיס.",
  CARD_EXPIRED: "הכרטיס פג תוקף.",
  CARD_TYPE_NOT_SUPPORTED: "סוג הכרטיס לא נתמך. נסה ויזה או מאסטרקארד, או שלם עם PayPal.",
  INSTRUMENT_DECLINED: "הבנק דחה את החיוב. הכרטיס יכול להיות תקין — פנה לבנק או נסה כרטיס אחר.",
  PAYMENT_DENIED: "PayPal דחה את התשלום. נסה כרטיס אחר או חשבון PayPal.",
  PAYER_CANNOT_PAY: "לא ניתן לחייב את אמצעי התשלום הזה. נסה כרטיס אחר או חשבון PayPal.",
  PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING: "סליקת כרטיסים לא פעילה כרגע. נסה לשלם עם PayPal.",
  UNPROCESSABLE_ENTITY: "לא הצלחנו לחייב את הכרטיס. נסה שוב, או שלם עם כפתור PayPal.",
  CARD_DECLINED: "הכרטיס נדחה. נסה כרטיס אחר או פנה לחברת האשראי.",
  INVALID_CARD_NUMBER: "מספר הכרטיס לא תקין.",
  INVALID_EXPIRY_DATE: "תאריך התוקף לא תקין.",
  AUTHENTICATION_FAILURE: "אימות הכרטיס נכשל. נסה שוב או כרטיס אחר.",
  TRANSACTION_REFUSED: "העסקה נדחתה. נסה כרטיס אחר או שלם עם PayPal.",
  CAPTURE_FAILED: "התשלום לא אושר. נסה שוב או כרטיס אחר.",
  DECLINED: "הבנק דחה את החיוב. נסה כרטיס אחר.",
};

const DEFAULT_HE = "לא הצלחנו לחייב את הכרטיס. נסה כרטיס אחר או שלם עם PayPal.";

type PaypalDetail = { issue?: string; description?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstIssue(details: unknown): string {
  if (!Array.isArray(details) || details.length === 0) return "";
  const issue = (details[0] as PaypalDetail | undefined)?.issue;
  return typeof issue === "string" ? issue : "";
}

function issueFromMessage(message: string): string {
  for (const code of Object.keys(ISSUE_HE)) {
    if (message.includes(code)) return code;
  }
  return "";
}

export function paypalErrorHe(err: unknown): string {
  const root = asRecord(err);
  const cause = asRecord(root?.cause);
  const nested = asRecord(root?.error);
  const rawMessage = String(root?.message ?? cause?.message ?? (typeof err === "string" ? err : ""));

  const alreadyHe =
    [...Object.values(ISSUE_HE), DEFAULT_HE].some((he) => rawMessage.startsWith(he)) ||
    /[\u0590-\u05FF]/.test(rawMessage);
  if (alreadyHe && rawMessage.length > 8) return rawMessage;

  const issue =
    firstIssue(root?.details) ||
    firstIssue(cause?.details) ||
    firstIssue(nested?.details) ||
    (typeof root?.issue === "string" ? root.issue : "") ||
    issueFromMessage(rawMessage);

  const debugId = [root?.debug_id, root?.debugId, cause?.debug_id, nested?.debug_id]
    .find((v) => typeof v === "string" && v.length > 0) as string | undefined;

  const he = ISSUE_HE[issue] ?? DEFAULT_HE;
  return debugId ? `${he} (קוד: ${debugId})` : he;
}

export function paypalApiErrorMessage(body: unknown, fallback: string): string {
  const rec = asRecord(body);
  if (!rec) return fallback;
  return paypalErrorHe({
    message: typeof rec.message === "string" ? rec.message : fallback,
    details: rec.details,
    debug_id: rec.debug_id,
    issue: rec.name,
  });
}

type CardFieldState = { isValid?: boolean; isEmpty?: boolean; isPotentiallyValid?: boolean };

export function cardFieldsInvalidHe(state: { fields?: Record<string, CardFieldState> }): string {
  const fields = state.fields ?? {};
  const labels: Array<[string[], string]> = [
    [["cardNumberField", "number"], "מספר כרטיס"],
    [["cardExpiryField", "expiry"], "תוקף"],
    [["cardCvvField", "cvv"], "CVV"],
    [["cardNameField", "name"], "שם על הכרטיס"],
  ];
  const bad = labels
    .filter(([keys]) =>
      keys.some((key) => {
        const field = fields[key];
        return field && (field.isEmpty || field.isValid === false);
      }),
    )
    .map(([, label]) => label);
  if (bad.length) return `יש לתקן: ${bad.join(", ")}`;
  return "מלא את כל שדות הכרטיס";
}
