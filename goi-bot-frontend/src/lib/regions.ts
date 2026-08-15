// Israel regional mapping for couriers
// Used to group/aggregate couriers by macro region.

export const REGIONS = [
  "מרכז",
  "צפון",
  "דרום",
  "השרון",
  "ירושלים והסביבה",
  "שפלה",
  "אחר",
] as const;

export type Region = (typeof REGIONS)[number];

// City → region. Keys are normalized (trim + no leading "ה").
const CITY_TO_REGION: Record<string, Region> = {
  // מרכז (Center / Gush Dan)
  "תל אביב": "מרכז",
  "תל אביב יפו": "מרכז",
  "תל אביב-יפו": "מרכז",
  "יפו": "מרכז",
  "רמת גן": "מרכז",
  "גבעתיים": "מרכז",
  "בני ברק": "מרכז",
  "פתח תקווה": "מרכז",
  "פתח תקוה": "מרכז",
  "ראשון לציון": "מרכז",
  "חולון": "מרכז",
  "בת ים": "מרכז",
  "אור יהודה": "מרכז",
  "יהוד": "מרכז",
  "יהוד מונוסון": "מרכז",
  "קריית אונו": "מרכז",
  "קרית אונו": "מרכז",
  "רמת השרון": "מרכז",
  "אזור": "מרכז",
  "לוד": "מרכז",
  "רמלה": "מרכז",
  "מודיעין": "מרכז",
  "מודיעין מכבים רעות": "מרכז",
  "שוהם": "מרכז",
  "אלעד": "מרכז",
  "ראש העין": "מרכז",
  "גני תקווה": "מרכז",
  "סביון": "מרכז",
  "קריית עקרון": "מרכז",
  "קרית עקרון": "מרכז",
  "מזכרת בתיה": "מרכז",
  "רחובות": "מרכז",
  "נס ציונה": "מרכז",
  "יבנה": "מרכז",
  "גדרה": "מרכז",
  "באר יעקב": "מרכז",

  // השרון (Sharon)
  "הרצליה": "השרון",
  "רעננה": "השרון",
  "כפר סבא": "השרון",
  "הוד השרון": "השרון",
  "נתניה": "השרון",
  "אבן יהודה": "השרון",
  "תל מונד": "השרון",
  "קדימה": "השרון",
  "קדימה צורן": "השרון",
  "צורן": "השרון",
  "פרדסיה": "השרון",
  "קלנסווה": "השרון",
  "טייבה": "השרון",
  "טירה": "השרון",
  "חדרה": "השרון",
  "אור עקיבא": "השרון",
  "פרדס חנה": "השרון",
  "פרדס חנה כרכור": "השרון",
  "זכרון יעקב": "השרון",
  "בנימינה": "השרון",
  "בנימינה גבעת עדה": "השרון",
  "קיסריה": "השרון",
  "ג'לג'וליה": "השרון",
  "ג׳לג׳וליה": "השרון",
  "כפר יונה": "השרון",
  "אבן ספיר": "השרון",
  "אליכין": "השרון",

  // צפון (North)
  "חיפה": "צפון",
  "קריית אתא": "צפון",
  "קרית אתא": "צפון",
  "קריית ים": "צפון",
  "קרית ים": "צפון",
  "קריית ביאליק": "צפון",
  "קרית ביאליק": "צפון",
  "קריית מוצקין": "צפון",
  "קרית מוצקין": "צפון",
  "נשר": "צפון",
  "טירת הכרמל": "צפון",
  "עכו": "צפון",
  "נהריה": "צפון",
  "כרמיאל": "צפון",
  "צפת": "צפון",
  "טבריה": "צפון",
  "מגדל העמק": "צפון",
  "עפולה": "צפון",
  "נצרת": "צפון",
  "נצרת עילית": "צפון",
  "נוף הגליל": "צפון",
  "קריית שמונה": "צפון",
  "קרית שמונה": "צפון",
  "מעלות": "צפון",
  "מעלות תרשיחא": "צפון",
  "שפרעם": "צפון",
  "סחנין": "צפון",
  "אום אל פחם": "צפון",
  "ערערה": "צפון",
  "באקה אל גרבייה": "צפון",
  "טמרה": "צפון",
  "כפר כנא": "צפון",
  "יקנעם": "צפון",
  "יקנעם עילית": "צפון",
  "בית שאן": "צפון",
  "פוריידיס": "צפון",
  "דאלית אל כרמל": "צפון",
  "עוספיא": "צפון",
  "ראש פינה": "צפון",
  "חצור הגלילית": "צפון",

  // ירושלים והסביבה
  "ירושלים": "ירושלים והסביבה",
  "מבשרת ציון": "ירושלים והסביבה",
  "בית שמש": "ירושלים והסביבה",
  "מעלה אדומים": "ירושלים והסביבה",
  "גבעת זאב": "ירושלים והסביבה",
  "ביתר עילית": "ירושלים והסביבה",
  "אבו גוש": "ירושלים והסביבה",
  "צור הדסה": "ירושלים והסביבה",
  "אפרת": "ירושלים והסביבה",

  // דרום (South)
  "באר שבע": "דרום",
  "אשדוד": "דרום",
  "אשקלון": "דרום",
  "קריית גת": "דרום",
  "קרית גת": "דרום",
  "קריית מלאכי": "דרום",
  "קרית מלאכי": "דרום",
  "נתיבות": "דרום",
  "אופקים": "דרום",
  "שדרות": "דרום",
  "דימונה": "דרום",
  "ערד": "דרום",
  "ירוחם": "דרום",
  "מצפה רמון": "דרום",
  "אילת": "דרום",
  "רהט": "דרום",
  "תל שבע": "דרום",
  "מיתר": "דרום",
  "להבים": "דרום",
  "עומר": "דרום",
  "שגב שלום": "דרום",
  "כסיפה": "דרום",
  "חורה": "דרום",
  "לקיה": "דרום",

  // שפלה (Shfela)
  "קריית מלאכי ": "שפלה",
};

function normalize(city: string): string {
  return city.trim().replace(/^ה(?=\S)/, "");
}

export function regionOf(city: string | null | undefined): Region {
  if (!city) return "אחר";
  const key = normalize(city);
  return CITY_TO_REGION[key] ?? CITY_TO_REGION[city.trim()] ?? "אחר";
}

/** Signup / profile work areas — exact Hebrew labels stored on the courier. */
export const WORK_AREA_OPTIONS = [
  "אזור צפון",
  "אזור שרון",
  "אזור מרכז",
  "אזור דרום",
  "אזור שפלה וירושלים",
  "כל הארץ",
] as const;

export type WorkAreaLabel = (typeof WORK_AREA_OPTIONS)[number];

export const NATIONWIDE_WORK_AREA: WorkAreaLabel = "כל הארץ";
export const WORK_AREA_REQUIRED_ERROR = "יש לבחור לפחות אזור עבודה אחד";

const ADMIN_REGION_TO_WORK_AREA: Record<Region, WorkAreaLabel | null> = {
  צפון: "אזור צפון",
  השרון: "אזור שרון",
  מרכז: "אזור מרכז",
  דרום: "אזור דרום",
  שפלה: "אזור שפלה וירושלים",
  "ירושלים והסביבה": "אזור שפלה וירושלים",
  אחר: null,
};

const WORK_AREA_TO_ADMIN_REGIONS: Record<string, Region[]> = {
  "אזור צפון": ["צפון"],
  "אזור שרון": ["השרון"],
  "אזור מרכז": ["מרכז"],
  "אזור דרום": ["דרום"],
  "אזור שפלה וירושלים": ["שפלה", "ירושלים והסביבה"],
  [NATIONWIDE_WORK_AREA]: REGIONS.filter((r) => r !== "אחר"),
};

export function isWorkAreaLabel(value: string): value is WorkAreaLabel {
  return (WORK_AREA_OPTIONS as readonly string[]).includes(value);
}

export function workAreaOf(city: string | null | undefined): WorkAreaLabel | null {
  if (!city) return null;
  const trimmed = city.trim();
  if (isWorkAreaLabel(trimmed)) return trimmed;
  if (trimmed.includes(NATIONWIDE_WORK_AREA)) return NATIONWIDE_WORK_AREA;
  const direct = ADMIN_REGION_TO_WORK_AREA[regionOf(trimmed)];
  if (direct) return direct;
  for (const [name, region] of Object.entries(CITY_TO_REGION)) {
    if (name.length >= 3 && trimmed.includes(name)) {
      const mapped = ADMIN_REGION_TO_WORK_AREA[region];
      if (mapped) return mapped;
    }
  }
  return null;
}

export function toggleWorkArea(selected: string[], option: string): string[] {
  if (option === NATIONWIDE_WORK_AREA) {
    return selected.includes(NATIONWIDE_WORK_AREA) ? [] : [NATIONWIDE_WORK_AREA];
  }
  const withoutNationwide = selected.filter((a) => a !== NATIONWIDE_WORK_AREA);
  return withoutNationwide.includes(option)
    ? withoutNationwide.filter((a) => a !== option)
    : [...withoutNationwide, option];
}

export function splitWorkingAreas(values: string[] | null | undefined): {
  selected: string[];
  legacy: string[];
} {
  const selected: string[] = [];
  const legacy: string[] = [];
  for (const raw of values ?? []) {
    const v = raw.trim();
    if (!v) continue;
    if (isWorkAreaLabel(v)) selected.push(v);
    else legacy.push(v);
  }
  return { selected, legacy };
}

/** City / address overlap plus city → signup-region mapping. */
export function locationMatchesWorkAreas(location: string | null | undefined, areas: string[]): boolean {
  if (areas.some((a) => a === NATIONWIDE_WORK_AREA || a.includes(NATIONWIDE_WORK_AREA))) return true;
  const loc = String(location ?? "").trim();
  if (!loc) return true;
  const locWorkArea = workAreaOf(loc);
  return areas.some((area) => {
    if (area === loc || loc.includes(area) || area.includes(loc)) return true;
    if (locWorkArea && area === locWorkArea) return true;
    const areaWork = workAreaOf(area);
    return !!(locWorkArea && areaWork && locWorkArea === areaWork);
  });
}

// Aggregate regions of base city + all working/pickup/dropoff areas.
export function regionsOfCourier(c: {
  base_city?: string | null;
  working_areas?: string[] | null;
  pickup_areas?: string[] | null;
  dropoff_areas?: string[] | null;
}): Region[] {
  const set = new Set<Region>();
  const addPlace = (place: string) => {
    const mapped = WORK_AREA_TO_ADMIN_REGIONS[place.trim()];
    if (mapped) {
      mapped.forEach((r) => set.add(r));
      return;
    }
    set.add(regionOf(place));
  };
  if (c.base_city) addPlace(c.base_city);
  for (const arr of [c.working_areas, c.pickup_areas, c.dropoff_areas]) {
    (arr ?? []).forEach(addPlace);
  }
  return Array.from(set);
}
