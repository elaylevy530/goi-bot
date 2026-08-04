// Pure classification engine — given a courier-like object and an array of rules,
// returns the tag_ids that match.

export type ClassificationRule = {
  id: string;
  field: string;
  operator: string;
  value: string;
  tag_id: string;
  enabled: boolean;
};

export type CourierLike = {
  vehicle_type?: string | null;
  invoice_status?: string | null;
  base_city?: string | null;
  experience?: string | null;
  working_areas?: string[] | null;
  job_types?: string[] | null;
  availability?: string[] | null;
};

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : [];

const asString = (v: unknown): string => (v == null ? "" : String(v));

export function evaluateRule(rule: ClassificationRule, c: CourierLike): boolean {
  if (!rule.enabled) return false;
  const raw = (c as Record<string, unknown>)[rule.field];
  const val = rule.value.trim();

  switch (rule.operator) {
    case "equals":
      return asString(raw).trim() === val;
    case "not_equals":
      return asString(raw).trim() !== val;
    case "contains":
      // works for strings and string[] alike
      if (Array.isArray(raw)) return asArray(raw).some((x) => x.includes(val));
      return asString(raw).includes(val);
    case "in":
      // value is comma-separated list
      return val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .includes(asString(raw).trim());
    case "has":
      // working_areas / job_types / availability contain exact value
      return asArray(raw).includes(val);
    default:
      return false;
  }
}

export function matchTagIds(
  rules: ClassificationRule[],
  c: CourierLike,
): string[] {
  const ids = new Set<string>();
  for (const r of rules) {
    if (evaluateRule(r, c)) ids.add(r.tag_id);
  }
  return [...ids];
}

export const RULE_FIELDS = [
  { value: "vehicle_type", label: "סוג רכב (legacy)" },
  { value: "vehicle_types", label: "כלי עבודה" },
  { value: "invoice_status", label: "חשבונית" },
  { value: "base_city", label: "עיר בסיס" },
  { value: "experience", label: "ניסיון (טקסט)" },
  { value: "courier_experience_status", label: "סטטוס ניסיון" },
  { value: "courier_experience_duration", label: "ותק" },
  { value: "working_areas", label: "אזורי עבודה רצויים" },
  { value: "pickup_areas", label: "אזורי איסוף" },
  { value: "dropoff_areas", label: "אזורי מסירה" },
  { value: "work_distance_from_base", label: "מרחק מבסיס" },
  { value: "job_types", label: "סוגי עבודה" },
  { value: "availability", label: "זמינות" },
] as const;

export const RULE_OPERATORS = [
  { value: "equals", label: "שווה ל-" },
  { value: "not_equals", label: "שונה מ-" },
  { value: "contains", label: "מכיל" },
  { value: "in", label: "אחד מ- (מופרד בפסיקים)" },
  { value: "has", label: "ברשימה (לערכי מערך)" },
] as const;
