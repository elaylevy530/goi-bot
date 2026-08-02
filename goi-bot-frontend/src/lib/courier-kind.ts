import { useQuery } from "@tanstack/react-query";

export type CourierKind = "courier" | "mover";

export type CourierTerms = {
  kind: CourierKind;
  /** שליח / מוביל */
  worker: string;
  workerPlural: string;
  /** משלוח / הובלה */
  job: string;
  jobPlural: string;
  theJob: string;
  availableJobs: string;
  availableJobsSub: string;
  activeJobs: string;
  activeJobsSub: string;
  myJobs: string;
  myJobsSub: string;
  takeJob: string;
  jobTaken: string;
  jobClosed: string;
  jobRemoved: string;
  quotesTitle: string;
  quotesSub: string;
  panel: string;
};

const COURIER_TERMS: CourierTerms = {
  kind: "courier",
  worker: "שליח",
  workerPlural: "שליחים",
  job: "משלוח",
  jobPlural: "משלוחים",
  theJob: "המשלוח",
  availableJobs: "משלוחים פנויים",
  availableJobsSub: "משלוחים שמחכים לך באזור",
  activeJobs: "משלוחים פעילים",
  activeJobsSub: "המשלוחים המאושרים שלך כרגע",
  myJobs: "המשלוחים שלי",
  myJobsSub: "היסטוריה ודוחות הכנסות",
  takeJob: "אני לוקח את המשלוח",
  jobTaken: "⚠️ המשלוח כבר נתפס על-ידי שליח אחר",
  jobClosed: "המשלוח כבר נסגר",
  jobRemoved: "המשלוח הוסר מהרשימה שלך",
  quotesTitle: "הצעות מחיר ששלחת",
  quotesSub: "מעקב אחרי הצעות שהגשת ללקוחות",
  panel: "פאנל שליחים",
};

const MOVER_TERMS: CourierTerms = {
  kind: "mover",
  worker: "מוביל",
  workerPlural: "מובילים",
  job: "הובלה",
  jobPlural: "הובלות",
  theJob: "ההובלה",
  availableJobs: "הובלות פנויות",
  availableJobsSub: "הובלות שמחכות לך באזור",
  activeJobs: "הובלות פעילות",
  activeJobsSub: "ההובלות המאושרות שלך כרגע",
  myJobs: "ההובלות שלי",
  myJobsSub: "היסטוריית הובלות ודוחות הכנסות",
  takeJob: "אני לוקח את ההובלה",
  jobTaken: "⚠️ ההובלה כבר נתפסה על-ידי מוביל אחר",
  jobClosed: "ההובלה כבר נסגרה",
  jobRemoved: "ההובלה הוסרה מהרשימה שלך",
  quotesTitle: "הצעות מחיר ששלחת",
  quotesSub: "מעקב אחרי הצעות שהגשת ללקוחות הובלה",
  panel: "פאנל מובילים",
};

export function termsFor(kind: CourierKind | null | undefined): CourierTerms {
  return kind === "mover" ? MOVER_TERMS : COURIER_TERMS;
}

const KIND_STORAGE_KEY = "goi.courier_kind";

/** Last known kind, persisted so the UI renders in the right terms on first paint. */
export function readCachedCourierKind(): CourierKind | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = window.localStorage.getItem(KIND_STORAGE_KEY);
    return v === "mover" || v === "courier" ? v : undefined;
  } catch {
    return undefined;
  }
}

export function cacheCourierKind(kind: CourierKind) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KIND_STORAGE_KEY, kind);
  } catch {
    /* ignore */
  }
}

/** Reads the signed-in courier's kind (courier / mover). Shares cache with useMyCourier. */
export function useCourierKind(): CourierKind {
  const cached = readCachedCourierKind();
  const { data } = useQuery({
    queryKey: ["my-courier-kind"],
    queryFn: async (): Promise<CourierKind> => {
      const { nestMyCourier, getNestAccessToken } = await import("@/lib/nest-auth");
      if (!getNestAccessToken()) return cached ?? "courier";
      const row = await nestMyCourier();
      const kind: CourierKind =
        (row?.courier_kind as CourierKind | undefined) === "mover" ? "mover" : "courier";
      cacheCourierKind(kind);
      return kind;
    },
    // Render immediately with the last known kind — no courier→mover flash.
    initialData: cached,
    staleTime: 5 * 60_000,
  });
  return data ?? cached ?? "courier";
}


/** Terminology adapted to the signed-in courier's kind. */
export function useCourierTerms(): CourierTerms {
  return termsFor(useCourierKind());
}
