import type { SelectedPlace } from "@/components/customer/AddressAutocomplete";

export type ServiceType =
  | "small_delivery"
  | "single_item"
  | "small_move"
  | "big_move"
  | "purchase_pickup";

export type ScheduleType = "now" | "scheduled";

export type ItemRow = { label: string; qty: number };

export type AccessBlock = {
  floor: string;
  elevator: "yes" | "no" | "";
  parking: "yes" | "no" | "unknown" | "";
  walking: "close" | "medium" | "far" | "";
};

export type Order = {
  serviceType: ServiceType | null;
  scheduleType: ScheduleType;
  scheduledAt: string; // ISO local for datetime-local input
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  pickupText: string;
  dropoffText: string;

  // Recipient
  selfRecipient: boolean;
  recipientName: string;
  recipientPhone: string;

  // Small delivery
  smallKind: string; // מסמך / שקית / חבילה / מפתח / אחר
  smallSize: "small" | "medium" | "large" | "";
  fragile: boolean;

  // Single item
  singleItem: string;
  singleQty: number;
  needsLiftHelp: boolean;
  needsTwoMovers: "yes" | "no" | "unknown" | "";
  needsAssembly: boolean;

  // Small move / big move
  items: ItemRow[];
  boxesRange: "0-5" | "6-10" | "11-20" | "20+" | "";
  largeItemsCount: "1" | "2" | "3" | "4+" | "";
  apartmentSize: "1" | "2" | "3" | "4" | "5+" | "";
  specialItems: string[]; // pianoetc
  needsPacking: boolean;

  // Purchase pickup
  alreadyPaid: "yes" | "no" | "";
  payAtPickup: boolean;
  pickupContactName: string;
  pickupContactPhone: string;

  // Access
  pickupAccess: AccessBlock;
  dropoffAccess: AccessBlock;

  // Media / notes
  photos: { path: string; url: string }[];
  notes: string;
  moverVehicle: string; // maps to existing MOVER_VEHICLES key

  // Pricing
  pricingMode: "instant" | "quotes" | "";
  offeredPrice: string;

  termsAccepted: boolean;
};

export const emptyAccess: AccessBlock = { floor: "", elevator: "", parking: "", walking: "" };

export const initialOrder: Order = {
  serviceType: null,
  scheduleType: "now",
  scheduledAt: "",
  pickup: null,
  dropoff: null,
  pickupText: "",
  dropoffText: "",
  selfRecipient: true,
  recipientName: "",
  recipientPhone: "",
  smallKind: "",
  smallSize: "",
  fragile: false,
  singleItem: "",
  singleQty: 1,
  needsLiftHelp: false,
  needsTwoMovers: "",
  needsAssembly: false,
  items: [],
  boxesRange: "",
  largeItemsCount: "",
  apartmentSize: "",
  specialItems: [],
  needsPacking: false,
  alreadyPaid: "",
  payAtPickup: false,
  pickupContactName: "",
  pickupContactPhone: "",
  pickupAccess: { ...emptyAccess },
  dropoffAccess: { ...emptyAccess },
  photos: [],
  notes: "",
  moverVehicle: "",
  pricingMode: "",
  offeredPrice: "",
  termsAccepted: false,
};

export type StepKey =
  | "service"
  | "addresses"
  | "details"
  | "access"
  | "pricing"
  | "searching";

/** Which existing backend service_category to send for each new service type. */
export function toBackendCategory(
  s: ServiceType,
  schedule: ScheduleType,
): "same_day" | "scheduled" | "small_move" | "big_move" {
  if (s === "small_delivery" || s === "purchase_pickup") {
    return schedule === "scheduled" ? "scheduled" : "same_day";
  }
  if (s === "single_item" || s === "small_move") return "small_move";
  return "big_move";
}

/** Whether this service type requires the access-conditions step. */
export function needsAccessStep(s: ServiceType | null): boolean {
  return s === "single_item" || s === "small_move" || s === "big_move" || s === "purchase_pickup";
}

/** Whether pricing should default to instant fixed price or to quotes. */
export function suggestPricingMode(s: ServiceType | null): "instant" | "quotes" {
  if (s === "big_move") return "quotes";
  return "instant";
}

export const SERVICE_META: Record<ServiceType, { title: string; subtitle: string; emoji: string }> = {
  small_delivery: { title: "משלוח פרטי קטן", subtitle: "מסמך, שקית, פריט קטן", emoji: "📦" },
  single_item: { title: "פריט בודד", subtitle: "ספה, מקרר, מיטה, שולחן", emoji: "🛋️" },
  small_move: { title: "הובלה קטנה", subtitle: "כמה פריטים או חדר קטן", emoji: "🚚" },
  big_move: { title: "הובלת דירה", subtitle: "מעבר דירה מלא", emoji: "🏠" },
  purchase_pickup: { title: "איסוף רכישה", subtitle: "יד 2, חנות, איקאה, Marketplace", emoji: "🛍️" },
};
