export const COURIER_NOTIFICATION_CATEGORIES = [
  "system",
  "bonus",
  "wallet",
  "jobs",
  "personal",
] as const;

export type CourierNotificationCategory = (typeof COURIER_NOTIFICATION_CATEGORIES)[number];

export type CourierNotificationLike = {
  category?: string | null;
  title?: string | null;
  body?: string | null;
  link_url?: string | null;
  audience?: string | null;
  courier_id?: string | null;
};

const CATEGORY_SET = new Set<string>(COURIER_NOTIFICATION_CATEGORIES);

export function isCourierNotificationCategory(value: string | null | undefined): value is CourierNotificationCategory {
  return !!value && CATEGORY_SET.has(value);
}

function haystack(row: CourierNotificationLike) {
  return [row.title, row.body, row.link_url].filter(Boolean).join(" ").toLowerCase();
}

export function inferCourierNotificationCategory(row: CourierNotificationLike): CourierNotificationCategory {
  const text = haystack(row);
  const link = row.link_url ?? "";

  if (
    /\/courier\/wallet|ארנק|משיכ|תשלום|חשבונית|withdrawal/.test(text) ||
    link.includes("/courier/wallet")
  ) {
    return "wallet";
  }
  if (
    /בונוס|הטב|קופון|פרס|bonus|\/courier\/share/.test(text) ||
    link.includes("/courier/share")
  ) {
    return "bonus";
  }
  if (
    /משלוח|עבוד|איסוף|מסיר|הזמנ|\/courier\/(active|new-jobs|history)/.test(text) ||
    /\/courier\/(active|new-jobs|history)/.test(link)
  ) {
    return "jobs";
  }
  if (row.audience === "single" || !!row.courier_id) return "personal";
  return "system";
}

export function resolveCourierNotificationCategory(row: CourierNotificationLike): CourierNotificationCategory {
  if (isCourierNotificationCategory(row.category) && row.category !== "system") {
    return row.category;
  }
  return inferCourierNotificationCategory(row);
}
