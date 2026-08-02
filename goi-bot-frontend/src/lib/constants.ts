// Constants / option lists used by selects and badges across the admin panel.
// These match the Postgres enums defined in the database migration.

export const COURIER_STATUSES = [
  "חדש","נרשם","ממתין לאישור","מושהה","פעיל","לא פעיל","חסר פרטים",
  "שלחתי עבודה","לקח עבודה","לא רלוונטי","חסום",
] as const;
export type CourierStatus = (typeof COURIER_STATUSES)[number];

export const VEHICLE_TYPES = ["קטנוע","רכב","אופניים חשמליים","הליכה"] as const;
export const AVAILABILITY = ["בוקר","צהריים","ערב","לילה","סופ״ש"] as const;
export const INVOICE_STATUS = ["כן","לא","תסדרו אותי"] as const;

export const JOB_TYPES = [
  "משלוח בודד","משמרת לפי שעה","קו חלוקה","משלוחי אוכל","חבילות / מסמכים","אחר",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  "טיוטה","נשלחה לשליחים","ממתינה לתגובות","יש שליחים שאישרו",
  "נבחר שליח","פעילה","הושלמה","בוטלה","תקועה",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const CUSTOMER_TYPES = [
  "מסעדה","חנות","עסק מקומי","לקוח פרטי","חברת הפצה","אחר",
] as const;
export const CUSTOMER_STATUSES = ["חדש","פעיל","מושהה"] as const;

export const PREFERRED_JOB_TYPES = [
  "משלוח בודד","משמרת לפי שעה","קו קבוע","מכרז שליחים","מחיר קבוע",
] as const;

export const WITHDRAWAL_STATUSES = ["ממתינה","אושרה","שולמה","נדחתה"] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const PAYMENT_METHODS = [
  { value: "bank", label: "העברה בנקאית" },
  { value: "bit", label: "ביט" },
  { value: "paybox", label: "פייבוקס" },
  { value: "cash", label: "מזומן" },
] as const;

export const SUPPORTED_VARIABLES = [
  "{{name}}","{{phone}}","{{area}}","{{job_type}}",
  "{{payment}}","{{time}}","{{login_link}}","{{username}}","{{password}}",
];
