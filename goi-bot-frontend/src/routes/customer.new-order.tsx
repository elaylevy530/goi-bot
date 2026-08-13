import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { nestReadPlatformFlag } from "@/lib/nest-platform-settings";
import { nestDeleteFile, nestSignedFileUrlResolved, nestUploadFile } from "@/lib/nest-files";
import { getGuestIdentity, setGuestIdentity, addGuestOrder } from "@/lib/guest-session";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { AddressAutocomplete, type SelectedPlace } from "@/components/customer/AddressAutocomplete";
import { OrderMap } from "@/components/customer/OrderMap";
import { MunchInline } from "@/components/customer/MunchInline";
import {
  getPricingRulesFn,
  createGuestOrderFn,
  confirmGuestOrderFn,
  getGuestJobStatusFn,
  getGuestJobQuotesFn,
  selectGuestJobQuoteFn,
} from "@/lib/guest-order.functions";
import { getPartnerBySlugFn } from "@/lib/partners.functions";


import {
  Bike, Calendar, PackageCheck, Truck, Loader2, ShieldCheck, ArrowRight, Calendar as CalIcon, Car,
  Sofa, Refrigerator, Bed, BedDouble, Armchair, WashingMachine, Tv, Utensils, UtensilsCrossed, Piano, Boxes, Package,
  Radar, CheckCircle2, Menu, Camera, X, Plus, Minus, User, Phone, FileText,
  ShoppingBag, HandPlatter, Store, Wallet, Coffee,
  Lamp, Dumbbell, Monitor, BookOpen, Microwave, Wind, MoreHorizontal, Bath, Baby, Printer,
  Archive, Laptop, Flame, Snowflake, PenTool, Building2,
} from "lucide-react";
import tileMunchImg from "@/assets/tile-munch.png";
import tileMoveImg from "@/assets/tile-move.png";
import tileBringImg from "@/assets/tile-bring.png";
import tileSendImg from "@/assets/tile-send.png";
import tileMoveApartmentImg from "@/assets/tile-move-apartment.png";
import tileMoveOfficeImg from "@/assets/tile-move-office.png";
import tileMoveClearImg from "@/assets/tile-move-clear.png";



const searchSchema = z.object({
  service: z.enum(["same_day", "scheduled", "small_move", "big_move"]).optional(),
  guest: z.union([z.string(), z.number()]).optional(),
  p: z.string().trim().min(1).max(60).optional(),
});

const PARTNER_SLUG_KEY = "goi_partner_slug";

export const Route = createFileRoute("/customer/new-order")({
  head: () => ({ meta: [{ title: "הזמנת הובלה — Goi" }] }),
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  component: NewOrderPage,
});

type ServiceKey = "same_day" | "scheduled" | "small_move" | "big_move";

const SERVICES: {
  id: string;
  key: ServiceKey;
  title: string;
  short: string;
  desc: string;
  icon: any;
  image: string;
  bg: string;   // card gradient
  ring: string; // subtle ring color
  glow: string; // soft glow behind illustration
}[] = [
  { id: "move",      key: "small_move", title: "הובלה קטנה",   short: "הובלה",   desc: "פרטים בדדים, ריהוט או מכשיר",   icon: Truck,       image: tileMoveImg,
    bg: "linear-gradient(160deg,#F4F6FA 0%,#E6EAF2 100%)", ring: "#C2CBDB55", glow: "#5C7CFA" },
  { id: "apartment", key: "big_move",   title: "הובלת דירה",   short: "דירה",    desc: "דירה — משאית וצוות",  icon: Truck,       image: tileMoveApartmentImg,
    bg: "linear-gradient(160deg,#F1F5FF 0%,#DFE8FB 100%)", ring: "#A9BEEA55", glow: "#3B6FE0" },
  { id: "office",  key: "small_move", title: "הובלה משרדית", short: "משרד",   desc: "משרד, חנות או סטודיו — ציוד משרדי", icon: Building2,  image: tileMoveOfficeImg,
    bg: "linear-gradient(160deg,#F3FBF2 0%,#DDF2DA 100%)", ring: "#A6D9A055", glow: "#22C55E" },
  { id: "clear",     key: "small_move", title: "פינוי ופריקה", short: "פינוי",   desc: "פינוי ריהוט ישן וגרוטאות",     icon: Package,     image: tileMoveClearImg,
    bg: "linear-gradient(160deg,#FFF7EE 0%,#FFE7CE 100%)", ring: "#F5B27A55", glow: "#FF8A3D" },
];


const PACKAGE_SIZES = [
  { key: "מעטפה", label: "מעטפה", sub: "מסמכים" },
  { key: "קטן", label: "קטן", sub: "עד 5 ק״ג" },
  { key: "בינוני", label: "בינוני", sub: "עד 10 ק״ג" },
  { key: "גדול", label: "גדול", sub: "עד 20 ק״ג" },
];

// 2-hour arrival windows for movers
const MOVE_WINDOWS: { start: string; label: string }[] = [
  { start: "06:00", label: "06–08" },
  { start: "08:00", label: "08–10" },
  { start: "10:00", label: "10–12" },
  { start: "12:00", label: "12–14" },
  { start: "14:00", label: "14–16" },
  { start: "16:00", label: "16–18" },
  { start: "18:00", label: "18–20" },
  { start: "20:00", label: "20–22" },
];

// Move-specific condition flags shown as checkboxes
const MOVE_FLAGS: { key: string; label: string }[] = [
  { key: "גישה צרה", label: "גישה צרה" },
  { key: "חניה רחוקה", label: "חניה רחוקה" },
  { key: "מדרגות רבות", label: "מדרגות רבות" },
  { key: "בלי מעלית", label: "בלי מעלית" },
  { key: "כלב בבית", label: "כלב בבית" },
  { key: "פריט שביר", label: "פריט שביר" },
  { key: "פריט כבד במיוחד", label: "פריט כבד במיוחד" },
  { key: "עומס בשעות היום", label: "עומס בשעות היום" },
];


const ACCESS_OPTS = [
  { key: "חניה צמודה", label: "חניה צמודה" },
  { key: "חניה רחוקה", label: "חניה רחוקה" },
  { key: "גישה צרה", label: "גישה צרה" },
] as const;

const CRANE_OPTS = [
  { key: "לא נדרש", label: "לא נדרש" },
  { key: "אולי נדרש", label: "אולי" },
  { key: "נדרש מנוף", label: "כן, מנוף" },
] as const;

const HELPERS_OPTS = [
  { key: "מוביל אחד", label: "מוביל אחד" },
  { key: "שני מובילים", label: "שניים" },
  { key: "שלושה ומעלה", label: "3+" },
] as const;

const HOME_SIZE_OPTS = [
  { key: "1-2 חדרים", label: "1–2 חד׳" },
  { key: "3 חדרים", label: "3 חד׳" },
  { key: "4 חדרים", label: "4 חד׳" },
  { key: "5 חדרים ומעלה", label: "5+ חד׳" },
] as const;

const BOXES_OPTS = [
  { key: "עד 10 קרטונים", label: "עד 10" },
  { key: "10-30 קרטונים", label: "10–30" },
  { key: "מעל 30 קרטונים", label: "30+" },
] as const;

const WORKSTATION_OPTS = [
  { key: "עד 5 עמדות", label: "עד 5" },
  { key: "6-15 עמדות", label: "6–15" },
  { key: "16-30 עמדות", label: "16–30" },
  { key: "מעל 30 עמדות", label: "30+" },
] as const;

const OFFICE_TIME_OPTS = [
  { key: "בשעות העבודה", label: "שעות עבודה" },
  { key: "אחרי שעות העבודה", label: "אחרי שעות" },
  { key: "בסוף שבוע", label: "סוף שבוע" },
] as const;

const OFFICE_ACCESS_OPTS = [
  { key: "יש מעלית שירות", label: "מעלית שירות" },
  { key: "יש רציף פריקה", label: "רציף פריקה" },
  { key: "נדרש אישור כניסת משאית", label: "אישור כניסה" },
] as const;

const WASTE_OPTS = [
  { key: "ריהוט ישן", label: "ריהוט" },
  { key: "מכשירי חשמל", label: "מכשירי חשמל" },
  { key: "פסולת בניין", label: "פסולת בניין" },
  { key: "גרוטאות כללי", label: "כללי" },
] as const;

const CLEAR_TARGET_OPTS = [
  { key: "פינוי למזבלה", label: "מזבלה" },
  { key: "תרומה", label: "תרומה" },
  { key: "לא משנה", label: "לא משנה" },
] as const;

const VOLUME_OPTS = [
  { key: "עד חדר", label: "עד חדר" },
  { key: "חדר עד חצי דירה", label: "חצי דירה" },
  { key: "דירה מלאה", label: "דירה מלאה" },
] as const;



const HOME_MOVE_CATEGORIES = [
  { key: "ספה", label: "ספה", icon: Sofa },
  { key: "מיטה", label: "מיטה", icon: BedDouble },
  { key: "מזרן", label: "מזרן", icon: Bed },
  { key: "ארון", label: "ארון", icon: Archive },
  { key: "שידה", label: "שידה", icon: Package },
  { key: "כורסה", label: "כורסה", icon: Armchair },
  { key: "כיסאות", label: "כיסאות", icon: Armchair },
  { key: "שולחן", label: "שולחן", icon: Utensils },
  { key: "שולחן כתיבה", label: "ש' כתיבה", icon: PenTool },
  { key: "ספריה", label: "ספריה", icon: BookOpen },
  { key: "מקרר", label: "מקרר", icon: Refrigerator },
  { key: "מקפיא", label: "מקפיא", icon: Snowflake },
  { key: "מכונת כביסה", label: "מכ' כביסה", icon: WashingMachine },
  { key: "מייבש", label: "מייבש", icon: Wind },
  { key: "מדיח", label: "מדיח", icon: UtensilsCrossed },
  { key: "תנור", label: "תנור", icon: Flame },
  { key: "מיקרוגל", label: "מיקרוגל", icon: Microwave },
  { key: "מזגן", label: "מזגן", icon: Snowflake },
  { key: "טלוויזיה", label: "טלוויזיה", icon: Tv },
  { key: "מחשב", label: "מחשב", icon: Laptop },
  { key: "מנורה", label: "מנורה", icon: Lamp },
  { key: "פסנתר", label: "פסנתר", icon: Piano },
  { key: "אופניים", label: "אופניים", icon: Bike },
  { key: "אופנוע", label: "אופנוע", icon: Bike },
  { key: "ספורט", label: "ציוד ספורט", icon: Dumbbell },
  { key: "עריסה", label: "עריסה", icon: Baby },
  { key: "אמבטיה", label: "אמבטיה", icon: Bath },
  { key: "קרטונים", label: "קרטונים", icon: Boxes },
];

const OFFICE_MOVE_CATEGORIES = [
  { key: "שולחן כתיבה", label: "שולחן כתיבה", icon: PenTool },
  { key: "כיסא משרדי", label: "כיסא משרדי", icon: Armchair },
  { key: "ארון משרדי", label: "ארון משרדי", icon: Archive },
  { key: "מדפים", label: "מדפים", icon: BookOpen },
  { key: "מחשב", label: "מחשב", icon: Laptop },
  { key: "מסך", label: "מסך", icon: Monitor },
  { key: "מדפסת", label: "מדפסת", icon: Printer },
  { key: "טלפון", label: "טלפון", icon: Phone },
  { key: "מקררון", label: "מקררון", icon: Refrigerator },
  { key: "מזגן", label: "מזגן", icon: Snowflake },
  { key: "שטיח", label: "שטיח", icon: Package },
  { key: "לוח", label: "לוח", icon: FileText },
  { key: "ציוד תצוגה", label: "ציוד תצוגה", icon: Tv },
  { key: "ארכיון", label: "ארכיון", icon: Archive },
  { key: "קרטונים", label: "קרטונים", icon: Boxes },
  { key: "מצלמות", label: "מצלמות", icon: Camera },
  { key: "מתקנים", label: "מתקנים", icon: Boxes },
  { key: "גינה/עציצים", label: "עציצים", icon: Package },
];

const ALL_MOVE_CATEGORIES = [...HOME_MOVE_CATEGORIES, ...OFFICE_MOVE_CATEGORIES];

function getMoveCategories(serviceId: string) {
  if (serviceId === "office") return OFFICE_MOVE_CATEGORIES;
  return HOME_MOVE_CATEGORIES;
}

const MOVER_VEHICLES: { key: "mini_van" | "van" | "truck_3_5t" | "truck_8t" | "truck_12t"; label: string; sub: string }[] = [
  { key: "mini_van", label: "מיני-טנדר", sub: "לחפצים בודדים · מקרר / ספה" },
  { key: "van", label: "טנדר", sub: "לחדר / חצי דירה" },
  { key: "truck_3_5t", label: "משאית 3.5 טון", sub: "דירת 1-2 חד׳" },
  { key: "truck_8t", label: "משאית 8 טון", sub: "דירת 3-4 חד׳" },
  { key: "truck_12t", label: "משאית 12 טון", sub: "דירה גדולה +" },
];

type ItemRow = { label: string; qty: number };
type CreatedOrder = Awaited<ReturnType<typeof createGuestOrderFn>>;


function NewOrderPage() {
  const navigate = useNavigate();
  const { service: initialService, guest: guestParam, p: partnerSlugParam } = Route.useSearch();
  const [service, setService] = useState<ServiceKey>(initialService ?? "small_move");
  const [serviceId, setServiceId] = useState<string>("move");

  const [partnerSlug, setPartnerSlug] = useState<string | null>(() => {
    if (partnerSlugParam) return partnerSlugParam;
    try {
      return typeof window !== "undefined"
        ? window.localStorage.getItem(PARTNER_SLUG_KEY)
        : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (partnerSlugParam) {
      try {
        window.localStorage.setItem(PARTNER_SLUG_KEY, partnerSlugParam);
      } catch {
        /* ignore */
      }
      setPartnerSlug(partnerSlugParam);
    }
  }, [partnerSlugParam]);

  const getPartner = useServerFn(getPartnerBySlugFn);
  const { data: partner } = useQuery({
    queryKey: ["partner", partnerSlug],
    enabled: !!partnerSlug,
    queryFn: () => getPartner({ data: { slug: partnerSlug as string } }),
  });


  const [pickup, setPickup] = useState<SelectedPlace | null>(null);
  const [dropoff, setDropoff] = useState<SelectedPlace | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [description, setDescription] = useState("");
  // Moves default to quote_request (movers price after seeing items/photos).
  const [pricingModel, setPricingModel] = useState<"fixed_price" | "quote_request">(
    (initialService ?? "small_move") === "small_move" || (initialService ?? "small_move") === "big_move"
      ? "quote_request"
      : "fixed_price",
  );
  const [offeredPrice, setOfferedPrice] = useState<string>("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const priceSectionRef = useRef<HTMLDivElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<{ full_name: string; phone: string }>({ full_name: "", phone: "" });

  const revealPriceError = (message: string) => {
    setPriceError(message);
    setExpanded(true);
    requestAnimationFrame(() => {
      priceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => priceInputRef.current?.focus(), 320);
    });
  };

  // Same-day timing (Gett-style): "now" = leave immediately, "today" = flexible window
  const [sameDayMode, setSameDayMode] = useState<"now" | "today">("now");
  const [nowDeliverBy, setNowDeliverBy] = useState<string>(""); // HH:MM latest delivery
  const [todayPickupBy, setTodayPickupBy] = useState<string>(""); // HH:MM latest pickup
  const [todayDeliverBy, setTodayDeliverBy] = useState<string>(""); // HH:MM latest delivery

  // Mover-specific timing: now / today window / scheduled date+window
  // moveTodayFrom / moveFrom hold the START of a 2h window ("08:00", "10:00", ...)
  const [moveWhen, setMoveWhen] = useState<"now" | "today" | "scheduled">("now");
  const [moveTodayFrom, setMoveTodayFrom] = useState<string>("");
  const [moveDate, setMoveDate] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState<string>("");

  // Mover-specific details (packing, flexibility, condition flags)
  const [moveDisassemble, setMoveDisassemble] = useState<"" | "yes" | "no" | "partial">("");
  const [movePacked, setMovePacked] = useState<"" | "yes" | "no" | "partial">("");
  const [moveFlexible, setMoveFlexible] = useState<boolean>(false);
  const [moveFlags, setMoveFlags] = useState<string[]>([]);

  // Extra mover details (shared + per-service)
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [moveAccess, setMoveAccess] = useState<string>("");
  const [moveCrane, setMoveCrane] = useState<string>("");
  const [moveHelpers, setMoveHelpers] = useState<string>("");
  const [moveHomeSize, setMoveHomeSize] = useState<string>("");
  const [moveBoxes, setMoveBoxes] = useState<string>("");
  const [moveWorkstations, setMoveWorkstations] = useState<string>("");
  const [moveOfficeTime, setMoveOfficeTime] = useState<string>("");
  const [moveOfficeAccess, setMoveOfficeAccess] = useState<string>("");
  const [moveWasteType, setMoveWasteType] = useState<string>("");
  const [moveClearTarget, setMoveClearTarget] = useState<string>("");
  const [moveVolume, setMoveVolume] = useState<string>("");

  // Recipient details ("אני הנמען" toggle defaults ON)
  const [selfRecipient, setSelfRecipient] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Place details for pickup/dropoff (building type + floor + apt)
  type PlaceKind = "" | "building" | "ground" | "house" | "apartment" | "office";
  const [pickupKind, setPickupKind] = useState<PlaceKind>("");
  const [pickupFloor, setPickupFloor] = useState("");
  const [pickupApt, setPickupApt] = useState("");
  const [pickupElevator, setPickupElevator] = useState<"" | "yes" | "no">("");
  const [dropoffKind, setDropoffKind] = useState<PlaceKind>("");
  const [dropoffFloor, setDropoffFloor] = useState("");
  const [dropoffApt, setDropoffApt] = useState("");
  const [dropoffElevator, setDropoffElevator] = useState<"" | "yes" | "no">("");

  // Multi-drop: extra dropoff stops for same courier
  type ExtraStop = { place: SelectedPlace | null; text: string; name: string; phone: string };
  const [extraStops, setExtraStops] = useState<ExtraStop[]>([]);

  // Explicit mover-vehicle for small_move/big_move
  const [moverVehicle, setMoverVehicle] = useState<typeof MOVER_VEHICLES[number]["key"] | "">("");
  // Vehicle preference for regular deliveries (two-wheeler vs car)
  const [deliveryVehicle, setDeliveryVehicle] = useState<"" | "two_wheeler" | "car">("");

  // Item lines (label + qty) — for moves
  const [items, setItems] = useState<ItemRow[]>([]);

  // Photos — uploaded to storage before submit
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  // "תביאו לי" state
  const [bringWhat, setBringWhat] = useState("");
  const [bringStoreName, setBringStoreName] = useState("");

  // "מאנצ׳" state
  const [munchStoreName, setMunchStoreName] = useState("");
  const [munchList, setMunchList] = useState("");
  const [munchBudget, setMunchBudget] = useState("");

  const isBring = serviceId === "bring";
  const isMunch = serviceId === "munch";

  // Persist form draft PER service rubric — switching service loads its own saved draft
  const DRAFTS_KEY = "customer.new-order.drafts.v2";
  const LAST_SERVICE_KEY = "customer.new-order.last-service.v2";
  const hydratedRef = useRef(false);
  const loadingDraftRef = useRef(false);

  function readAllDrafts(): Record<string, any> {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFTS_KEY) : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function applyDraft(d: any) {
    loadingDraftRef.current = true;
    // Reset everything to defaults, then apply saved values (if any)
    // Addresses are intentionally NOT restored — always start empty on entry
    setPickup(null);
    setDropoff(null);
    setPickupText("");
    setDropoffText("");
    setScheduledAt(typeof d?.scheduledAt === "string" ? d.scheduledAt : "");
    setDescription(typeof d?.description === "string" ? d.description : "");
    setPricingModel(d?.pricingModel ?? "fixed_price");
    setOfferedPrice(typeof d?.offeredPrice === "string" ? d.offeredPrice : "");
    setSameDayMode(d?.sameDayMode ?? "now");
    setNowDeliverBy(typeof d?.nowDeliverBy === "string" ? d.nowDeliverBy : "");
    setTodayPickupBy(typeof d?.todayPickupBy === "string" ? d.todayPickupBy : "");
    setTodayDeliverBy(typeof d?.todayDeliverBy === "string" ? d.todayDeliverBy : "");
    setMoveWhen(d?.moveWhen === "today" || d?.moveWhen === "scheduled" ? d.moveWhen : "now");
    setMoveTodayFrom(typeof d?.moveTodayFrom === "string" ? d.moveTodayFrom : "");
    setMoveDate(typeof d?.moveDate === "string" ? d.moveDate : "");
    setMoveFrom(typeof d?.moveFrom === "string" ? d.moveFrom : "");
    setMoveDisassemble(d?.moveDisassemble === "yes" || d?.moveDisassemble === "no" || d?.moveDisassemble === "partial" ? d.moveDisassemble : "");
    setMovePacked(d?.movePacked === "yes" || d?.movePacked === "no" || d?.movePacked === "partial" ? d.movePacked : "");
    setMoveFlexible(typeof d?.moveFlexible === "boolean" ? d.moveFlexible : false);
    setMoveFlags(Array.isArray(d?.moveFlags) ? d.moveFlags.filter((x: unknown) => typeof x === "string") : []);
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    setMoveAccess(str(d?.moveAccess));
    setMoveCrane(str(d?.moveCrane));
    setMoveHelpers(str(d?.moveHelpers));
    setMoveHomeSize(str(d?.moveHomeSize));
    setMoveBoxes(str(d?.moveBoxes));
    setMoveWorkstations(str(d?.moveWorkstations));
    setMoveOfficeTime(str(d?.moveOfficeTime));
    setMoveOfficeAccess(str(d?.moveOfficeAccess));
    setMoveWasteType(str(d?.moveWasteType));
    setMoveClearTarget(str(d?.moveClearTarget));
    setMoveVolume(str(d?.moveVolume));
    setSelfRecipient(typeof d?.selfRecipient === "boolean" ? d.selfRecipient : false);
    setRecipientName(typeof d?.recipientName === "string" ? d.recipientName : "");
    setRecipientPhone(typeof d?.recipientPhone === "string" ? d.recipientPhone : "");
    setPickupKind(typeof d?.pickupKind === "string" ? d.pickupKind : "");
    setPickupFloor(typeof d?.pickupFloor === "string" ? d.pickupFloor : "");
    setPickupApt(typeof d?.pickupApt === "string" ? d.pickupApt : "");
    setPickupElevator(d?.pickupElevator === "yes" || d?.pickupElevator === "no" ? d.pickupElevator : "");
    setDropoffKind(typeof d?.dropoffKind === "string" ? d.dropoffKind : "");
    setDropoffFloor(typeof d?.dropoffFloor === "string" ? d.dropoffFloor : "");
    setDropoffApt(typeof d?.dropoffApt === "string" ? d.dropoffApt : "");
    setDropoffElevator(d?.dropoffElevator === "yes" || d?.dropoffElevator === "no" ? d.dropoffElevator : "");
    setExtraStops(Array.isArray(d?.extraStops) ? d.extraStops : []);
    setMoverVehicle(typeof d?.moverVehicle === "string" ? d.moverVehicle : "");
    setDeliveryVehicle(d?.deliveryVehicle === "two_wheeler" || d?.deliveryVehicle === "car" ? d.deliveryVehicle : "");
    setItems(Array.isArray(d?.items) ? d.items : []);
    setBringWhat(typeof d?.bringWhat === "string" ? d.bringWhat : "");
    setBringStoreName(typeof d?.bringStoreName === "string" ? d.bringStoreName : "");
    setMunchStoreName(typeof d?.munchStoreName === "string" ? d.munchStoreName : "");
    setMunchList(typeof d?.munchList === "string" ? d.munchList : "");
    setMunchBudget(typeof d?.munchBudget === "string" ? d.munchBudget : "");
    // Release the guard after state batch commits
    setTimeout(() => { loadingDraftRef.current = false; }, 0);
  }

  // Switch the active service rubric — save current draft then load target's draft
  function switchService(newServiceId: string, newServiceKey: ServiceKey) {
    if (newServiceId === serviceId) { setService(newServiceKey); return; }
    const drafts = readAllDrafts();
    applyDraft(drafts[newServiceId] ?? null);
    setServiceId(newServiceId);
    setService(newServiceKey);
    try { window.localStorage.setItem(LAST_SERVICE_KEY, newServiceId); } catch {}
  }

  // Hydrate on mount — load draft for the last-used service
  useEffect(() => {
    try {
      const lastId = window.localStorage.getItem(LAST_SERVICE_KEY);
      const drafts = readAllDrafts();
      const targetId = lastId ?? serviceId;
      const meta = SERVICES.find((s) => s.id === targetId);
      if (meta) {
        setServiceId(meta.id);
        setService(meta.key);
      }
      applyDraft(drafts[targetId] ?? null);
    } catch {}
    hydratedRef.current = true;
  }, []);


  // Save current fields under the active serviceId (after hydration; skipped while loading a draft)
  useEffect(() => {
    if (!hydratedRef.current || loadingDraftRef.current) return;
    try {
      const draft = {
        service,
        // pickup/dropoff intentionally excluded — do not persist addresses across sessions
        scheduledAt, description, pricingModel, offeredPrice,
        sameDayMode, nowDeliverBy, todayPickupBy, todayDeliverBy,
        moveWhen, moveTodayFrom, moveDate, moveFrom,
        moveDisassemble, movePacked, moveFlexible, moveFlags,
        moveAccess, moveCrane, moveHelpers, moveHomeSize, moveBoxes,
        moveWorkstations, moveOfficeTime, moveOfficeAccess, moveWasteType, moveClearTarget, moveVolume,
        selfRecipient, recipientName, recipientPhone,
        pickupKind, pickupFloor, pickupApt, pickupElevator, dropoffKind, dropoffFloor, dropoffApt, dropoffElevator,
        extraStops, moverVehicle, deliveryVehicle, items,
        bringWhat, bringStoreName, munchStoreName, munchList, munchBudget,
      };
      const all = readAllDrafts();
      all[serviceId] = draft;
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
      window.localStorage.setItem(LAST_SERVICE_KEY, serviceId);
    } catch {}
  }, [
    service, serviceId,
    scheduledAt, description, pricingModel, offeredPrice,
    sameDayMode, nowDeliverBy, todayPickupBy, todayDeliverBy,
    moveWhen, moveTodayFrom, moveDate, moveFrom,
    moveDisassemble, movePacked, moveFlexible, moveFlags,
    moveAccess, moveCrane, moveHelpers, moveHomeSize, moveBoxes,
    moveWorkstations, moveOfficeTime, moveOfficeAccess, moveWasteType, moveClearTarget, moveVolume,
    selfRecipient, recipientName, recipientPhone,
    pickupKind, pickupFloor, pickupApt, pickupElevator, dropoffKind, dropoffFloor, dropoffApt, dropoffElevator,
    extraStops, moverVehicle, deliveryVehicle, items,
    bringWhat, bringStoreName, munchStoreName, munchList, munchBudget,
  ]);




  useEffect(() => {
    (async () => {
      const forceGuest = guestParam != null && String(guestParam) !== "" && String(guestParam) !== "0";
      const { fetchNestSession } = await import("@/lib/nest-auth");
      const session = await fetchNestSession();
      if (forceGuest || !session?.roles.includes("customer")) {
        // Guest mode — reuse the details they entered on a previous order
        const g = getGuestIdentity();
        if (g) setProfile({ full_name: g.full_name, phone: g.phone });
        setIsGuestMode(true);
        return;
      }
      setProfile({
        full_name: session.profile?.name ?? "לקוח",
        phone: session.profile?.phone ?? session.email?.split("@")[0] ?? "",
      });
    })();
  }, [guestParam]);

  const getRules = useServerFn(getPricingRulesFn);
  const { data: rules } = useQuery({ queryKey: ["pricing-rules"], queryFn: () => getRules() });
  const { data: featureFlags } = useQuery({
    queryKey: ["platform-settings", "tile-flags"],
    queryFn: async () => ({
      munch: await nestReadPlatformFlag("munch_enabled"),
      send: await nestReadPlatformFlag("send_enabled"),
      bring: await nestReadPlatformFlag("bring_enabled"),
    }),
  });
  const munchEnabled = featureFlags?.munch ?? true;
  const sendEnabled = featureFlags?.send ?? true;
  const bringEnabled = featureFlags?.bring ?? true;
  // Launch phase: private customers order moving services only — all tiles are moves.
  const visibleServices = SERVICES;

  const [munchComingSoonOpen, setMunchComingSoonOpen] = useState(false);
  // Fallback so the price block always renders even if rules haven't loaded yet.
  const rule = useMemo(() => {
    const found = (rules ?? []).find((r: any) => r.service_category === service);
    if (found) return found;
    return {
      service_category: service,
      display_name: service === "big_move" ? "הובלת דירה" : service === "small_move" ? "הובלה קטנה" : "משלוח",
      base_price: 0,
      price_per_km: 0,
      min_price: 0,
      payment_mode: "cash_only",
      allow_customer_fixed_price: true,
      allow_customer_quote: true,
    };
  }, [rules, service]);

  // Reset pricing model if service switches to one that doesn't allow it
  useEffect(() => {
    if (!rule) return;
    if (pricingModel === "fixed_price" && !rule.allow_customer_fixed_price) setPricingModel("quote_request");
    if (pricingModel === "quote_request" && !rule.allow_customer_quote) setPricingModel("fixed_price");
  }, [rule, pricingModel]);

  // Moves default to "quote_request" so the mover can price after seeing photos/items
  const moveDefaultAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const isMoveNow = service === "small_move" || service === "big_move";
    if (!isMoveNow) return;
    if (moveDefaultAppliedRef.current === service) return;
    if (rule.allow_customer_quote) {
      setPricingModel("quote_request");
      moveDefaultAppliedRef.current = service;
    }
  }, [rule, service]);

  const createOrder = useServerFn(createGuestOrderFn);
  const confirmOrder = useServerFn(confirmGuestOrderFn);

  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestDialog, setGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const openGuestDialog = () => {
    const saved = getGuestIdentity();
    setGuestName((prev) => prev || profile.full_name || saved?.full_name || "");
    setGuestPhone((prev) => prev || profile.phone || saved?.phone || "");
    setGuestDialog(true);
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!pickup) throw new Error("בחר כתובת איסוף מהרשימה");
      if (!dropoff) throw new Error("בחר כתובת מסירה מהרשימה");
      if (!profile.phone) throw new Error("חסר מספר טלפון בפרופיל");
      if (service === "scheduled" && !scheduledAt) throw new Error("בחר תאריך ושעה למשלוח מתוזמן");
      if (service === "same_day" && sameDayMode === "now" && !nowDeliverBy) throw new Error("בחר עד מתי למסור");
      if (service === "same_day" && sameDayMode === "today" && (!todayPickupBy || !todayDeliverBy))
        throw new Error("בחר חלון איסוף ומסירה");
      if (pricingModel === "fixed_price" && !offeredPrice) {
        revealPriceError("הזן מחיר שאתה מציע");
        throw new Error("הזן מחיר שאתה מציע");
      }
      if (!selfRecipient && (!recipientName.trim() || !recipientPhone.trim()))
        throw new Error("הזן שם וטלפון של הנמען");
      const isMoveCat = service === "small_move" || service === "big_move";
      if (isMoveCat) {
        if (moveWhen === "today" && !moveTodayFrom)
          throw new Error("בחר חלון שעות להובלה היום");
        if (moveWhen === "scheduled" && (!moveDate || !moveFrom))
          throw new Error("בחר תאריך וחלון שעות להובלה");
      }
      // Vehicle picker removed — dispatch fans out to all matching movers
      if (isBring && !bringWhat.trim()) throw new Error("כתוב מה השליח צריך להביא");
      if (isMunch && !munchStoreName.trim()) throw new Error("הזן את שם הקיוסק/מרכול");
      if (isMunch && !munchList.trim()) throw new Error("הזן רשימת קניות");
      if (isMunch && !munchBudget) throw new Error("הזן תקציב מקסימלי");
      if (!termsAccepted) throw new Error("יש לאשר את תנאי השירות");

      // Build same-day timing note prepended to description
      let finalDescription = description;
      let sameDayScheduled: string | null = null;
      if (service === "same_day") {
        const timingNote =
          sameDayMode === "now"
            ? `יציאה: עכשיו · מסירה עד ${nowDeliverBy}`
            : `איסוף עד ${todayPickupBy} · מסירה עד ${todayDeliverBy}`;
        finalDescription = finalDescription ? `${timingNote} · ${finalDescription}` : timingNote;
        if (sameDayMode === "today" && todayPickupBy) {
          const [h, m] = todayPickupBy.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          sameDayScheduled = d.toISOString();
        }
      }
      // Mover timing note + scheduled_at
      let moveScheduled: string | null = null;
      const windowEnd = (start: string) => {
        const [h, m] = start.split(":").map(Number);
        const eh = String((h + 2) % 24).padStart(2, "0");
        return `${eh}:${String(m).padStart(2, "0")}`;
      };
      if (isMoveCat) {
        let timingNote = "";
        if (moveWhen === "now") {
          timingNote = "מוביל: מיידי — מחפש עכשיו";
        } else if (moveWhen === "today") {
          timingNote = `מוביל: היום · ${moveTodayFrom}–${windowEnd(moveTodayFrom)}`;
          const [h, m] = moveTodayFrom.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          moveScheduled = d.toISOString();
        } else if (moveWhen === "scheduled") {
          timingNote = `מוביל: ${moveDate} · ${moveFrom}–${windowEnd(moveFrom)}`;
          const [h, m] = moveFrom.split(":").map(Number);
          const d = new Date(`${moveDate}T00:00:00`);
          d.setHours(h, m, 0, 0);
          moveScheduled = d.toISOString();
        }
        if (timingNote) {
          finalDescription = finalDescription ? `${timingNote} · ${finalDescription}` : timingNote;
        }
        // Move-specific details: packing, flexibility, condition flags
        const detailParts: string[] = [];
        if (moveDisassemble) {
          detailParts.push(
            `פירוק/הרכבה: ${moveDisassemble === "yes" ? "נדרש" : moveDisassemble === "no" ? "לא נדרש" : "חלקי"}`,
          );
        }
        if (movePacked) {
          detailParts.push(
            `אריזה: ${movePacked === "yes" ? "הכל ארוז" : movePacked === "no" ? "לא ארוז" : "ארוז חלקית"}`,
          );
        }
        if (moveFlexible) detailParts.push("גמיש בזמן — מוזיל מחיר");
        if (moveAccess) detailParts.push(`גישה: ${moveAccess}`);
        if (moveCrane && moveCrane !== "לא נדרש") detailParts.push(`מנוף: ${moveCrane}`);
        if (serviceId === "move" && moveHelpers) detailParts.push(`כוח אדם: ${moveHelpers}`);
        if (serviceId === "apartment") {
          if (moveHomeSize) detailParts.push(`גודל דירה: ${moveHomeSize}`);
          if (moveBoxes) detailParts.push(`קרטונים: ${moveBoxes}`);
        }
        if (serviceId === "office") {
          if (moveWorkstations) detailParts.push(`עמדות עבודה: ${moveWorkstations}`);
          if (moveOfficeTime) detailParts.push(`ביצוע: ${moveOfficeTime}`);
          if (moveOfficeAccess) detailParts.push(`נגישות: ${moveOfficeAccess}`);
        }
        if (serviceId === "clear") {
          if (moveWasteType) detailParts.push(`סוג פינוי: ${moveWasteType}`);
          if (moveClearTarget) detailParts.push(`יעד: ${moveClearTarget}`);
          if (moveVolume) detailParts.push(`נפח: ${moveVolume}`);
        }
        if (moveFlags.length > 0) detailParts.push(`⚠ ${moveFlags.join(", ")}`);
        if (detailParts.length > 0) {
          const note = detailParts.join(" · ");
          finalDescription = finalDescription ? `${finalDescription} · ${note}` : note;
        }
      }
      // Prepend pickup/dropoff place details
      const kindLabel: Record<typeof pickupKind, string> = {
        "": "", building: "בניין", ground: "קרקע", house: "בית פרטי", apartment: "דירה", office: "משרד",
      };
      const placeParts = (kind: PlaceKind, floor: string, apt: string, elevator: "" | "yes" | "no") => {
        const parts: string[] = [];
        if (kind) parts.push(kindLabel[kind]);
        if (floor) parts.push(`קומה ${floor}`);
        if (apt) parts.push(kind === "office" ? `משרד ${apt}` : `דירה ${apt}`);
        if (floor && elevator) parts.push(elevator === "yes" ? "עם מעלית" : "בלי מעלית");
        return parts.join(", ");
      };
      const pickupExtra = placeParts(pickupKind, pickupFloor, pickupApt, pickupElevator);
      const dropoffExtra = placeParts(dropoffKind, dropoffFloor, dropoffApt, dropoffElevator);
      if (pickupExtra) finalDescription = finalDescription ? `איסוף: ${pickupExtra} · ${finalDescription}` : `איסוף: ${pickupExtra}`;
      if (dropoffExtra) finalDescription = finalDescription ? `${finalDescription} · מסירה: ${dropoffExtra}` : `מסירה: ${dropoffExtra}`;

      // Multi-drop extra stops (same courier, multiple addresses)
      const validStops = extraStops.filter((s) => s.place && s.text.trim());
      if (validStops.length > 0) {
        const stopsNote = validStops
          .map((s, i) => `יעד ${i + 2}: ${s.place!.address}${s.name ? ` (${s.name}${s.phone ? ` ${s.phone}` : ""})` : ""}`)
          .join(" · ");
        finalDescription = finalDescription ? `${finalDescription} · ${stopsNote}` : stopsNote;
      }

      if (isMoveCat && moverVehicle) {
        const label = MOVER_VEHICLES.find((v) => v.key === moverVehicle)?.label ?? moverVehicle;
        finalDescription = finalDescription ? `רכב: ${label} · ${finalDescription}` : `רכב: ${label}`;
      }
      if (!isMoveCat && deliveryVehicle) {
        const label = deliveryVehicle === "two_wheeler" ? "דו-גלגלי" : "רכב";
        finalDescription = finalDescription ? `רכב: ${label} · ${finalDescription}` : `רכב: ${label}`;
      }
      if (items.length > 0) {
        const itemsNote = items.map((i) => `${i.qty}×${i.label}`).join(", ");
        finalDescription = finalDescription ? `${finalDescription} · פריטים: ${itemsNote}` : `פריטים: ${itemsNote}`;
      }
      if (isBring) {
        const storePart = bringStoreName.trim() ? ` מ־${bringStoreName.trim()}` : "";
        const bringNote = `🤲 תביאו לי: ${bringWhat.trim()}${storePart}`;
        finalDescription = finalDescription ? `${bringNote} · ${finalDescription}` : bringNote;
      }
      if (isMunch) {
        const munchNote = `🛍️ מאנצ׳ מ־${munchStoreName.trim()} · תקציב עד ₪${munchBudget} · רשימה: ${munchList.trim().replace(/\s*\n\s*/g, ", ")}`;
        finalDescription = finalDescription ? `${munchNote} · ${finalDescription}` : munchNote;
      }
      // Mark the specific moving service so movers + admin see it at a glance
      const serviceNote =
        serviceId === "office" ? "🏢 הובלה משרדית"
        : serviceId === "clear" ? "🗑️ פינוי ופריקה"
        : serviceId === "apartment" ? "🚚 הובלת דירה / משרד"
        : "";
      if (serviceNote) {
        finalDescription = finalDescription ? `${serviceNote} · ${finalDescription}` : serviceNote;
      }

      const payload = {
        service_category: service,
        guest_name: profile.full_name,
        guest_phone: profile.phone,
        pickup_address: pickup.address,
        dropoff_address: dropoff.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        recipient_name: selfRecipient ? null : recipientName.trim(),
        recipient_phone: selfRecipient ? null : recipientPhone.trim(),
        description: finalDescription || null,
        scheduled_at:
          service === "scheduled" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : (moveScheduled ?? sameDayScheduled),
        pricing_model: pricingModel,
        offered_price: pricingModel === "fixed_price" && offeredPrice ? Number(offeredPrice) : null,
        mover_vehicle: isMoveCat ? moverVehicle || null : null,
        items: items.length > 0 ? items : null,
        photo_paths: photos.length > 0 ? photos.map((p) => p.path) : null,
        terms_accepted: true as const,
        partner_slug: partnerSlug ?? null,
      };
      return await createOrder({ data: payload });
    },
    onSuccess: async (result) => {
      setCreated(result);
      if (isGuestMode) {
        addGuestOrder({
          job_id: result.job_id,
          tracking_token: result.tracking_token,
          job_number: String((result as any).job_number ?? ""),
          created_at: new Date().toISOString(),
        });
      }
      try {
        const all = readAllDrafts();
        delete all[serviceId];
        window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
      } catch {}
      try {
        await confirmOrder({ data: { job_id: result.job_id, tracking_token: result.tracking_token } });
      } catch (e: any) {
        toast.error(e?.message ?? "שגיאה בשידור למובילים");
        return;
      }
      toast.success("ההזמנה נשלחה למובילים!");
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה ביצירת ההזמנה"),
  });

  // Photo upload — directly into the private bucket, we cache a signed url for preview
  async function handlePhotoUpload(file: File) {
    if (photos.length >= 10) { toast.error("מקסימום 10 תמונות"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("הקובץ גדול מדי (מקס' 8MB)"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
      const uploaded = await nestUploadFile("guest-order-photos", file);
      const url = await nestSignedFileUrlResolved("guest-order-photos", uploaded.path, 3600);
      setPhotos((prev) => [...prev, { path: uploaded.path, url }]);
    } catch (e: any) {
      toast.error(e?.message ?? "שגיאה בהעלאת תמונה");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
    void nestDeleteFile("guest-order-photos", path).catch(() => {});
  }





  const distanceKm = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const R = 6371;
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((pickup.lat * Math.PI) / 180) * Math.cos((dropoff.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [pickup, dropoff]);

  const priceBreakdown = useMemo(() => {
    if (!rule) return null;
    const km = distanceKm ?? 0;
    const base = Number(rule.base_price ?? 0);
    const perKm = Number(rule.price_per_km ?? 0);
    const kmCost = km * perKm;
    const raw = base + kmCost;
    const minPrice = Number(rule.min_price ?? 0);
    const total = Math.round(Math.max(raw, minPrice));
    return { base, perKm, kmCost: Math.round(kmCost), km, total, minApplied: raw < minPrice, minPrice };
  }, [rule, distanceKm]);

  const suggestedPrice =
    distanceKm == null || !priceBreakdown || priceBreakdown.total <= 0
      ? null
      : priceBreakdown.total;

  const isMove = service === "small_move" || service === "big_move";


  const canContinue = !!pickup && !!dropoff && (!!profile.phone || isGuestMode);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (canContinue) setExpanded(true); }, [canContinue]);
  useEffect(() => { if (isMunch && dropoff) setExpanded(true); }, [isMunch, dropoff]);

  // No online payment in the launch flow: once the order is created it is
  // broadcast to movers immediately and the customer watches the live search
  // map until a mover accepts the price or their quote is chosen.
  if (created) {

    return (
      <SearchingSheet
        created={created}
        pickup={pickup}
        dropoff={dropoff}
        distanceKm={distanceKm}
        pricingModel={pricingModel}
        onFound={() => navigate({ to: "/customer/order/$id", params: { id: created.job_id } })}
        onBack={() => navigate({ to: "/customer/order/$id", params: { id: created.job_id } })}
      />
    );
  }



  return (
    <div className="fixed inset-0 bottom-16 md:bottom-0 flex flex-col bg-[#f5f6f8]">
      {/* Guest checkout — collect contact details without registration.
          Sit above the customer bottom nav (h-16) so actions stay tappable on mobile. */}
      {guestDialog && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 grid place-items-end sm:place-items-center p-0 pb-16 sm:p-4 sm:pb-4"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-checkout-title"
          onClick={() => setGuestDialog(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div id="guest-checkout-title" className="text-lg font-extrabold">כמעט שם</div>
                <p className="text-xs text-[#101418]/60 mt-0.5">
                  רק שם וטלפון כדי שהמוביל יוכל ליצור איתך קשר. לא צריך להירשם.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuestDialog(false)}
                aria-label="סגור"
                className="size-9 shrink-0 rounded-full grid place-items-center text-[#101418]/50 hover:bg-[#f5f6f8] active:scale-95 transition"
              >
                <X className="size-5" strokeWidth={2.2} />
              </button>
            </div>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="שם מלא"
              autoComplete="name"
              className="w-full rounded-2xl bg-[#f5f6f8] ring-1 ring-black/5 px-4 py-3 text-sm outline-none focus:ring-black/20"
            />
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="050-0000000"
              className="w-full rounded-2xl bg-[#f5f6f8] ring-1 ring-black/5 px-4 py-3 text-sm outline-none focus:ring-black/20 text-right"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGuestDialog(false)}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-[#101418]/60"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = guestName.trim();
                  const phone = guestPhone.replace(/[^0-9+]/g, "");
                  if (name.length < 2) return toast.error("הזן שם מלא");
                  if (phone.length < 9) return toast.error("הזן מספר טלפון תקין");
                  setGuestIdentity({ full_name: name, phone });
                  setProfile({ full_name: name, phone });
                  setGuestDialog(false);
                  setTimeout(() => submit.mutate(), 0);
                }}
                className="flex-1 rounded-2xl bg-[#101418] text-white py-3 text-sm font-extrabold"
              >
                שגר את ההזמנה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map on top */}
      <div
        className={`flex-1 relative ${expanded ? "min-h-[96px]" : "min-h-[240px]"}`}
        onClick={expanded ? () => setExpanded(false) : undefined}
      >
        <OrderMap pickup={pickup} dropoff={dropoff} className={`absolute inset-0 ${expanded ? "pointer-events-none" : ""}`} />
        {/* Hamburger → account */}
        <button
          type="button"
          onClick={() => navigate({ to: "/customer/account" })}
          aria-label="אזור אישי"
          className="absolute top-3 right-3 z-10 size-11 rounded-full bg-white shadow-lg ring-1 ring-black/10 grid place-items-center hover:bg-[#f5f6f8] active:scale-95 transition"
        >
          <Menu className="size-5 text-[#101418]" strokeWidth={2.4} />
        </button>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          {isMunch ? (
            <div className="inline-flex items-baseline gap-1">
              <span
                className="text-[28px] font-black italic tracking-tight leading-none"
                style={{ color: "#FF6A1A", textShadow: "0 2px 0 rgba(229,72,10,0.18)" }}
              >
                munch
              </span>
              <span className="text-[11px] font-bold text-[#101418]/60 leading-none">by GOI</span>
            </div>
          ) : (
            <span
              className="text-[30px] font-black italic tracking-tight leading-none"
              style={{ color: "#101418", textShadow: "0 2px 0 rgba(0,0,0,0.12)" }}
            >
              GOI
            </span>
          )}
        </div>
        {!pickup && !dropoff && !isMunch && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-white/95 backdrop-blur rounded-full px-4 py-2 text-xs font-semibold text-[#101418]/70 shadow-lg ring-1 ring-black/5">
              בחר כתובת איסוף ומסירה למטה
            </div>
          </div>
        )}
        {distanceKm && (
          <div className="absolute top-3 left-3 bg-[#101418] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            {distanceKm.toFixed(1)} ק"מ
          </div>
        )}
      </div>


      {/* Bottom sheet — addresses moved here for thumb reach */}
      <div
        className={`relative z-10 flex flex-col flex-shrink-0 bg-white rounded-t-3xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] overflow-hidden transition-[height,max-height] duration-300 ${
          expanded ? "h-[calc(100%-96px)] max-h-[calc(100%-96px)]" : "max-h-[360px]"
        }`}
      >
        {/* Grab handle (visual only) */}
        <div className="w-full flex justify-center pt-2 pb-1" aria-hidden>
          <div className="w-10 h-1 bg-black/15 rounded-full" />
        </div>

        {partner ? (
          <div className="px-3 pb-1 text-center text-xs font-bold text-[#101418]/70">
            🤝 בשיתוף {partner.name}
          </div>
        ) : null}

        {/* Address inputs — fixed at top only when collapsed; scroll with body when expanded */}
        {!expanded && (
          <div className="flex-shrink-0 px-3 pt-1 pb-2 space-y-2">
            {!isMunch && (
              <AddressAutocomplete
                label={isBring ? "איפה לאסוף?" : "מאיפה?"}
                placeholder={isBring ? "כתובת האיסוף" : "כתובת איסוף"}
                value={pickupText}
                onChange={(v) => { setPickupText(v); if (!v) setPickup(null); }}
                onSelect={(p) => { setPickup(p); setPickupText(p.address); }}
                accent="green"
              />
            )}
            <AddressAutocomplete
              label={isBring || isMunch ? "לאן להביא?" : "לאן?"}
              placeholder={isBring || isMunch ? "הכתובת שלך" : "כתובת מסירה"}
              value={dropoffText}
              onChange={(v) => { setDropoffText(v); if (!v) setDropoff(null); }}
              onSelect={(p) => { setDropoff(p); setDropoffText(p.address); }}
              accent="red"
            />
          </div>
        )}



        {/* Service tiles — rich cards with illustration + title + subtitle */}
        {!expanded && (
        <div className="flex-shrink-0 px-3 pt-2 pb-1">
          {!expanded && (
            <div className="mb-2 px-1">
              <h2 className="text-[15px] font-black text-[#101418] leading-tight">
                מה תרצה לעשות היום?
              </h2>
              <p className="text-[11px] text-[#101418]/50 mt-0.5">
                בחר שירות והמוביל בדרך אליך
              </p>
            </div>
          )}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleServices.length)}, minmax(0, 1fr))` }}
          >
            {visibleServices.map(({ id, key, title, desc, image, bg, ring, glow }) => {
              const active = expanded && serviceId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={(e) => {
                    if (id === "munch" && !munchEnabled) {
                      setMunchComingSoonOpen(true);
                      return;
                    }
                    switchService(id, key); setExpanded(true);
                    const btn = e.currentTarget as HTMLElement;
                    requestAnimationFrame(() => {
                      const sheet = btn.closest('[data-bottom-sheet-scroll]') as HTMLElement | null;
                      if (sheet) sheet.scrollTo({ top: 0, behavior: "smooth" });
                      const scroller = btn.closest('.overflow-y-auto') as HTMLElement | null;
                      if (scroller && scroller !== sheet) scroller.scrollTo({ top: 0, behavior: "smooth" });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      btn.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }}
                  className={`group relative flex flex-col items-center text-center rounded-2xl p-2 pb-2.5 transition active:scale-[0.97] overflow-hidden ${
                    active ? "ring-2 ring-[#101418] shadow-lg" : "ring-1 shadow-sm hover:shadow-md"
                  }`}
                  style={{
                    background: bg,
                    ...(active ? {} : { boxShadow: `0 2px 10px -4px ${glow}30` }),
                    ["--tw-ring-color" as any]: active ? "#101418" : ring,
                  }}
                >
                  {id === "munch" && (
                    <span
                      className={`absolute top-1 right-1 px-1.5 py-[3px] rounded-full text-white text-[8px] font-black leading-none shadow-md ring-2 ring-white tracking-wide z-10 ${
                        munchEnabled ? "bg-[#7c3aed]" : "bg-[#101418]/70"
                      }`}
                    >
                      {munchEnabled ? "חדש" : "בקרוב"}
                    </span>
                  )}

                  {/* Illustration slot */}
                  <div className={`relative w-full aspect-square grid place-items-center ${id === "office" ? "mb-0.5" : "mb-1.5"}`}>
                    <div
                      className={`absolute rounded-full opacity-30 blur-xl ${id === "office" ? "inset-1" : "inset-3"}`}
                      style={{ background: glow }}
                      aria-hidden
                    />
                    <img
                      src={image}
                      alt={title}
                      loading="lazy"
                      width={128}
                      height={128}
                      className={`relative w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.15)] ${id === "office" ? "scale-110" : ""}`}
                    />
                  </div>

                  <span className="text-[11px] font-black text-[#101418] leading-tight line-clamp-1">
                    {title}
                  </span>
                  <span className="text-[9px] text-[#101418]/55 leading-tight mt-0.5 line-clamp-2 min-h-[22px]">
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}




        {/* Options body — expanded only */}
        {expanded && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 space-y-3" data-bottom-sheet-scroll>
          {!isMunch && (() => {
            const meta = SERVICES.find((s) => s.id === serviceId) ?? SERVICES.find((s) => s.key === service)!;
            const Icon = meta.icon;
            return (
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-[#101418] text-white grid place-items-center flex-shrink-0">
                    <Icon className="size-5" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-black text-[#101418] leading-tight">{meta.title}</div>
                    <div className="text-[12px] text-[#101418]/60 mt-0.5 leading-snug">{meta.desc}</div>
                  </div>
                </div>
              </div>
            );

          })()}

          {isBring && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
                  <HandPlatter className="size-3" /> מה להביא?
                </label>
                <input
                  type="text"
                  value={bringWhat}
                  onChange={(e) => setBringWhat(e.target.value)}
                  placeholder="למשל: קרטון חלב, אריזה מהחנות, מפתחות…"
                  className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
                  <Store className="size-3" /> שם החנות/מקום (אופציונלי)
                </label>
                <input
                  type="text"
                  value={bringStoreName}
                  onChange={(e) => setBringStoreName(e.target.value)}
                  placeholder="שופרסל, איקאה, בית של אמא…"
                  className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {isMunch && (
            <>
              <div>
                <AddressAutocomplete
                  label="לאן להביא?"
                  placeholder="הכתובת שלך"
                  value={dropoffText}
                  onChange={(v) => { setDropoffText(v); if (!v) setDropoff(null); }}
                  onSelect={(p) => { setDropoff(p); setDropoffText(p.address); }}
                  accent="red"
                />
              </div>
              <MunchInline
                dropoff={dropoff}
                dropoffText={dropoffText}
              />
            </>
          )}

          {!isMunch && (<>
          {/* Addresses (scroll with body when sheet is expanded) */}
          <div className="space-y-2">
            <AddressAutocomplete
              label={isBring ? "איפה לאסוף?" : "מאיפה?"}
              placeholder={isBring ? "כתובת האיסוף" : "כתובת איסוף"}
              value={pickupText}
              onChange={(v) => { setPickupText(v); if (!v) setPickup(null); }}
              onSelect={(p) => { setPickup(p); setPickupText(p.address); }}
              accent="green"
            />
            {pickup && (
              <PlaceDetails
                kind={pickupKind} setKind={setPickupKind}
                floor={pickupFloor} setFloor={setPickupFloor}
                apt={pickupApt} setApt={setPickupApt}
                elevator={pickupElevator} setElevator={setPickupElevator}
              />
            )}
            <AddressAutocomplete
              label={isBring ? "לאן להביא?" : "לאן?"}
              placeholder={isBring ? "הכתובת שלך" : "כתובת מסירה"}
              value={dropoffText}
              onChange={(v) => { setDropoffText(v); if (!v) setDropoff(null); }}
              onSelect={(p) => { setDropoff(p); setDropoffText(p.address); }}
              accent="red"
            />
            {dropoff && (
              <PlaceDetails
                kind={dropoffKind} setKind={setDropoffKind}
                floor={dropoffFloor} setFloor={setDropoffFloor}
                apt={dropoffApt} setApt={setDropoffApt}
                elevator={dropoffElevator} setElevator={setDropoffElevator}
              />
            )}
          </div>

          {!isBring && (
            <ExtraStops stops={extraStops} setStops={setExtraStops} isMove={isMove} />
          )}



          {service === "same_day" && !isBring && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">גודל החבילה</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PACKAGE_SIZES.map((s) => {
                  const on = extraNotes(description).split(" · ")[0] === s.key || description.startsWith(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        const rest = description.replace(new RegExp(`^(${PACKAGE_SIZES.map(p=>p.key).join("|")})\\s*·?\\s*`), "");
                        setDescription(rest ? `${s.key} · ${rest}` : s.key);
                      }}
                      className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
                        on ? "border-2 border-[#F5C518] bg-[#FFF9E5] text-[#101418]" : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
                      }`}
                    >
                      <span className="text-xs font-black leading-tight">{s.label}</span>
                      <span className="text-[9px] font-semibold text-[#101418]/55 leading-tight">{s.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {service === "same_day" && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">מתי לצאת</label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setSameDayMode("now")}
                  className={`py-2.5 rounded-xl text-xs font-bold transition ${
                    sameDayMode === "now" ? "bg-[#101418] text-white" : "bg-[#f5f6f8] text-[#101418]/70"
                  }`}
                >
                  יציאה עכשיו
                </button>
                <button
                  type="button"
                  onClick={() => setSameDayMode("today")}
                  className={`py-2.5 rounded-xl text-xs font-bold transition ${
                    sameDayMode === "today" ? "bg-[#101418] text-white" : "bg-[#f5f6f8] text-[#101418]/70"
                  }`}
                >
                  במהלך היום
                </button>
              </div>

              {sameDayMode === "now" ? (
                <div>
                  <div className="text-[11px] text-[#101418]/60 mb-1">עד מתי אפשר למסור</div>
                  <input
                    type="time"
                    value={nowDeliverBy}
                    onChange={(e) => setNowDeliverBy(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-[#101418]/60 mb-1">איסוף עד</div>
                    <input
                      type="time"
                      value={todayPickupBy}
                      onChange={(e) => setTodayPickupBy(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#101418]/60 mb-1">מסירה עד</div>
                    <input
                      type="time"
                      value={todayDeliverBy}
                      onChange={(e) => setTodayDeliverBy(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {service === "scheduled" && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
                <CalIcon className="size-3" /> תאריך ושעה
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
              />
            </div>
          )}

          {/* Vehicle preference — regular deliveries (non-move) */}
          {!isMove && service && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
                <Bike className="size-3" /> סוג רכב מועדף
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: "two_wheeler", label: "דו-גלגלי", sub: "אופנוע / קטנוע", Icon: Bike },
                  { key: "car", label: "רכב", sub: "פרטי / מסחרי קטן", Icon: Car },
                ] as const).map((v) => {
                  const active = deliveryVehicle === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setDeliveryVehicle(active ? "" : v.key)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border-2 transition text-right ${
                        active ? "border-[#F5C518] bg-[#FFF9E5]" : "border-transparent bg-[#f5f6f8]"
                      }`}
                    >
                      <v.Icon className="size-4 text-[#101418]" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-black text-[#101418]">{v.label}</span>
                        <span className="text-[10px] text-[#101418]/60">{v.sub}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-[#101418]/50">אופציונלי — ללא בחירה נשלח לכל המובילים הזמינים</p>
            </div>
          )}


          {isMove && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
                <CalIcon className="size-3" /> מתי ההובלה?
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {([
                  { key: "now", label: "עכשיו", sub: "מחפש מוביל מיידית" },
                  { key: "today", label: "היום", sub: "טווח שעות" },
                  { key: "scheduled", label: "מתוזמן", sub: "תאריך + שעות" },
                ] as const).map((opt) => {
                  const active = moveWhen === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMoveWhen(opt.key)}
                      className={`py-2 px-1 rounded-xl text-center transition ${
                        active ? "bg-[#101418] text-white" : "bg-[#f5f6f8] text-[#101418]/70"
                      }`}
                    >
                      <div className="text-xs font-black leading-tight">{opt.label}</div>
                      <div className="text-[9px] font-semibold opacity-70 leading-tight mt-0.5">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              {moveWhen === "today" && (
                <div>
                  <div className="text-[11px] text-[#101418]/60 mb-1.5">בחר חלון של שעתיים</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MOVE_WINDOWS.map((w) => {
                      const active = moveTodayFrom === w.start;
                      return (
                        <button
                          key={w.start}
                          type="button"
                          onClick={() => setMoveTodayFrom(active ? "" : w.start)}
                          className={`py-2 rounded-xl text-xs font-black transition ${
                            active ? "bg-[#F5C518] text-[#101418] border-2 border-[#101418]" : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {moveWhen === "scheduled" && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-[#101418]/60 mb-1">תאריך</div>
                    <input
                      type="date"
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#101418]/60 mb-1.5">חלון של שעתיים</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MOVE_WINDOWS.map((w) => {
                        const active = moveFrom === w.start;
                        return (
                          <button
                            key={w.start}
                            type="button"
                            onClick={() => setMoveFrom(active ? "" : w.start)}
                            className={`py-2 rounded-xl text-xs font-black transition ${
                              active ? "bg-[#F5C518] text-[#101418] border-2 border-[#101418]" : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {moveWhen === "now" && (
                <p className="text-[11px] text-[#101418]/60 leading-snug">
                  ההזמנה תישלח מיידית למובילים באזור — הראשון שיאשר לוקח את העבודה.
                </p>
              )}
            </div>
          )}

          {isMove && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-2">מה מעבירים?</label>
              <MoveItemChips items={items} setItems={setItems} serviceId={serviceId} />
              <p className="mt-1.5 text-[10px] text-[#101418]/55">לחיצה מוסיפה פריט, לחיצה נוספת מבטלת. את הכמויות משנים ברשימה למטה.</p>
            </div>
          )}

          {isMove && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">פירוק והרכבה של רהיטים</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { key: "no", label: "לא נדרש" },
                  { key: "partial", label: "חלקי" },
                  { key: "yes", label: "כן, נדרש" },
                ] as const).map((opt) => {
                  const active = moveDisassemble === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMoveDisassemble(active ? "" : opt.key)}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        active ? "bg-[#F5C518] text-[#101418] border-2 border-[#101418]" : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isMove && (
            <div className="rounded-2xl bg-white ring-1 ring-black/5 p-3 space-y-3">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <span className="text-[12px] font-black text-[#101418]">פרטים נוספים למוביל</span>
                <span className="text-[11px] font-bold text-[#0E7A4A]">{moreOpen ? "סגור" : "פתח"}</span>
              </button>

              {moreOpen && (
                <div className="space-y-3">
                  <ChipRow label="גישה למשאית" options={ACCESS_OPTS} value={moveAccess} onChange={setMoveAccess} />
                  <ChipRow label="צורך במנוף" options={CRANE_OPTS} value={moveCrane} onChange={setMoveCrane} />
                  <ChipRow
                    label="אריזה"
                    options={[
                      { key: "yes", label: "הכל ארוז" },
                      { key: "partial", label: "ארוז חלקית" },
                      { key: "no", label: "לא ארוז" },
                    ]}
                    value={movePacked}
                    onChange={(v) => setMovePacked(v as typeof movePacked)}
                  />

                  {serviceId === "move" && (
                    <ChipRow label="כמה מובילים צריך?" options={HELPERS_OPTS} value={moveHelpers} onChange={setMoveHelpers} />
                  )}

                  {serviceId === "apartment" && (
                    <>
                      <ChipRow label="גודל הדירה" options={HOME_SIZE_OPTS} value={moveHomeSize} onChange={setMoveHomeSize} cols={4} />
                      <ChipRow label="כמות קרטונים" options={BOXES_OPTS} value={moveBoxes} onChange={setMoveBoxes} />
                    </>
                  )}

                  {serviceId === "office" && (
                    <>
                      <ChipRow label="עמדות עבודה" options={WORKSTATION_OPTS} value={moveWorkstations} onChange={setMoveWorkstations} cols={4} />
                      <ChipRow label="מתי מבצעים" options={OFFICE_TIME_OPTS} value={moveOfficeTime} onChange={setMoveOfficeTime} />
                      <ChipRow label="נגישות בבניין" options={OFFICE_ACCESS_OPTS} value={moveOfficeAccess} onChange={setMoveOfficeAccess} />
                    </>
                  )}

                  {serviceId === "clear" && (
                    <>
                      <ChipRow label="מה מפנים" options={WASTE_OPTS} value={moveWasteType} onChange={setMoveWasteType} cols={4} />
                      <ChipRow label="יעד הפינוי" options={CLEAR_TARGET_OPTS} value={moveClearTarget} onChange={setMoveClearTarget} />
                      <ChipRow label="נפח משוער" options={VOLUME_OPTS} value={moveVolume} onChange={setMoveVolume} />
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">תנאים בשטח</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOVE_FLAGS.map((f) => {
                        const active = moveFlags.includes(f.key);
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() =>
                              setMoveFlags((p) => (active ? p.filter((x) => x !== f.key) : [...p, f.key]))
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                              active
                                ? "bg-[#E7F6EC] text-[#0E7A4A] border-2 border-[#0E7A4A]"
                                : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] font-semibold text-[#101418]/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={moveFlexible}
                      onChange={(e) => setMoveFlexible(e.target.checked)}
                      className="size-4 accent-[#0E7A4A]"
                    />
                    אני גמיש בזמנים — זה בדרך כלל מוזיל את המחיר
                  </label>
                </div>
              )}
            </div>
          )}






          {/* Floor & apt fields live under each address in PlaceDetails */}


          {/* Mover vehicle removed — dispatch to all matching movers based on items */}

          {/* Item list with quantities — moves only */}
          {isMove && items.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">כמויות פריטים</label>
              <div className="space-y-1.5">
                {items.map((it, idx) => (
                  <div key={`${it.label}-${idx}`} className="flex items-center gap-2 bg-[#f5f6f8] rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm font-semibold text-[#101418] truncate">{it.label}</span>
                    <button
                      type="button"
                      onClick={() => setItems((p) => p.map((r, i) => i === idx ? { ...r, qty: Math.max(1, r.qty - 1) } : r))}
                      className="size-7 rounded-lg bg-white grid place-items-center active:scale-90"
                    ><Minus className="size-3.5" /></button>
                    <span className="text-sm font-black w-6 text-center">{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => setItems((p) => p.map((r, i) => i === idx ? { ...r, qty: Math.min(99, r.qty + 1) } : r))}
                      className="size-7 rounded-lg bg-white grid place-items-center active:scale-90"
                    ><Plus className="size-3.5" /></button>
                    <button
                      type="button"
                      onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      className="size-7 rounded-lg text-[#B00020] grid place-items-center active:scale-90"
                    ><X className="size-3.5" /></button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const label = window.prompt("הוסף פריט");
                  if (label && label.trim()) setItems((p) => [...p, { label: label.trim().slice(0, 60), qty: 1 }]);
                }}
                className="mt-1.5 text-[11px] font-bold text-[#101418]/60 inline-flex items-center gap-1"
              >
                <Plus className="size-3" /> הוסף פריט
              </button>
            </div>
          )}
          {isMove && items.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const label = window.prompt("הוסף פריט (למשל: מקרר)");
                if (label && label.trim()) setItems((p) => [...p, { label: label.trim().slice(0, 60), qty: 1 }]);
              }}
              className="w-full text-[11px] font-bold text-[#101418]/60 bg-[#f5f6f8] rounded-xl py-2 border border-dashed border-black/15 inline-flex items-center justify-center gap-1"
            >
              <Plus className="size-3" /> הוסף פריט עם כמות
            </button>
          )}

          {/* Recipient */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#101418]/60 uppercase flex items-center gap-1">
                <User className="size-3" /> פרטי הנמען
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#101418]/70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selfRecipient}
                  onChange={(e) => setSelfRecipient(e.target.checked)}
                  className="size-3.5 accent-[#F5C518]"
                />
                אני הנמען
              </label>
            </div>
            {!selfRecipient && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="שם הנמען"
                  className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm"
                />
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="טלפון הנמען"
                  className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm"
                />
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5 flex items-center gap-1">
              <Camera className="size-3" /> תמונות (אופציונלי, עד 10)
            </label>
            {isMove && (
              <p className="text-[11px] text-[#101418]/70 -mt-0.5 mb-1.5 leading-snug">
                טיפ: צלמו את הפריטים שתרצו להוביל כדי לקבל הצעת מחיר הכי מדוייקת.
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p.path} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f6f8]">
                  {p.url ? <img src={p.url} alt="תמונה" className="w-full h-full object-cover" /> : null}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.path)}
                    className="absolute top-1 left-1 size-6 rounded-full bg-black/70 text-white grid place-items-center"
                    aria-label="הסר תמונה"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-black/15 bg-[#f5f6f8] flex flex-col items-center justify-center text-[#101418]/50 cursor-pointer active:scale-95 transition">
                  {uploadingPhoto ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="size-5" />
                      <span className="text-[10px] font-bold mt-1">הוסף</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handlePhotoUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>




          <div>
            <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">
              {isMove ? "הערות (פירוק/הרכבה, אריזה, נגישות וכו')" : "תיאור החבילה / הערות לשליח (אופציונלי)"}
            </label>
            <input
              type="text"
              value={isMove ? extraNotes(description) : description}
              onChange={(e) => setDescription(isMove ? withNotes(description, e.target.value) : e.target.value)}
              placeholder={isMove ? "למשל: לפרק ארון, לארוז מזרן, גישה צרה…" : "שביר, למסור ביד, קוד לבניין…"}
              className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm"
            />
          </div>

          {/* Pricing */}
          {rule && (
            <div
              ref={priceSectionRef}
              className={`rounded-2xl transition-shadow ${
                priceError ? "ring-2 ring-red-500 bg-red-50/60 p-3 -mx-1" : ""
              }`}
            >
              <label className={`block text-[11px] font-bold uppercase mb-1.5 ${priceError ? "text-red-600" : "text-[#101418]/60"}`}>
                מחיר {pricingModel === "fixed_price" ? "(חובה)" : ""}
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {rule.allow_customer_fixed_price && (
                  <button
                    type="button"
                    onClick={() => { setPricingModel("fixed_price"); setPriceError(null); }}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      pricingModel === "fixed_price"
                        ? "bg-[#101418] text-white"
                        : "bg-[#f5f6f8] text-[#101418]/70"
                    }`}
                  >
                    אני מציע מחיר
                  </button>
                )}
                {rule.allow_customer_quote && (
                  <button
                    type="button"
                    onClick={() => { setPricingModel("quote_request"); setPriceError(null); }}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      pricingModel === "quote_request"
                        ? "bg-[#101418] text-white"
                        : "bg-[#f5f6f8] text-[#101418]/70"
                    }`}
                  >
                    קבל הצעות
                  </button>
                )}
              </div>
              {pricingModel === "fixed_price" ? (
                <>
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                    priceError ? "bg-white ring-2 ring-red-500" : "bg-[#f5f6f8]"
                  }`}>
                    <span className={`text-lg font-black ${priceError ? "text-red-400" : "text-[#101418]/40"}`}>₪</span>
                    <input
                      ref={priceInputRef}
                      type="number"
                      inputMode="numeric"
                      value={offeredPrice}
                      onChange={(e) => {
                        setOfferedPrice(e.target.value);
                        if (e.target.value) setPriceError(null);
                      }}
                      placeholder={String(suggestedPrice ?? rule.min_price ?? 0)}
                      aria-invalid={!!priceError}
                      className="flex-1 bg-transparent border-0 outline-none text-lg font-black text-[#101418]"
                    />
                    {suggestedPrice ? (
                      <button
                        type="button"
                        onClick={() => { setOfferedPrice(String(suggestedPrice)); setPriceError(null); }}
                        className="text-[11px] font-black text-[#101418] bg-[#F5C518] px-2.5 py-1.5 rounded-lg hover:bg-[#e6b70a] transition"
                      >
                        מומלץ: ₪{suggestedPrice}
                      </button>
                    ) : null}
                  </div>
                  {priceError ? (
                    <p className="text-[12px] font-bold text-red-600 mt-1.5 leading-snug">
                      {priceError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#101418]/60 mt-1.5 leading-snug">
                      זה מחיר מומלץ בלבד — אתה חופשי להציע כל סכום. מחיר גבוה יותר מגדיל את הסיכוי שיאשרו מהר.
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-[#f5f6f8] rounded-xl px-3 py-2.5 text-xs text-[#101418]/70">
                  {isMove ? "נציג לך עד 3 הצעות הכי משתלמות מהמובילים שרוצים את העבודה." : "מובילים ישלחו הצעות ותוכל לבחור את המתאים לך."}
                </div>
              )}

              {rule.payment_mode === "cash_only" && (
                <div className="text-[11px] text-[#101418]/50 mt-1.5">תשלום במזומן למוביל.</div>
              )}
            </div>
          )}

          {/* Distance + ETA hint (no price formula shown to customer) */}
          {distanceKm && (
            <div className="rounded-2xl bg-[#101418] text-white p-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/70">
                <Truck className="size-3.5" /> מרחק משוער
              </span>
              <span className="inline-flex items-center gap-3">
                <span className="font-black text-[#F5C518]">{distanceKm.toFixed(1)} ק״מ</span>
              </span>
            </div>
          )}
          </>)}

          {/* Inline CTA at bottom of scroll — for all non-munch services */}
          {!isMunch && (() => {
            const missingReason = !canContinue
              ? (!pickup ? "בחר נקודת איסוף כדי להמשיך" : !dropoff ? "בחר יעד כדי להמשיך" : "הוסף מספר טלפון כדי להמשיך")
              : !termsAccepted ? "סמן את אישור תנאי השירות"
              : null;
            const ctaLabel = isMove
              ? (rule?.payment_mode === "cash_only" ? "שלח הזמנה למובילים" : "מצא לי מוביל עכשיו")
              : (rule?.payment_mode === "cash_only" ? "שלח הזמנה לשליחים" : "מצא לי שליח עכשיו");
            const ready = !missingReason;
            return (
              <div className="pt-4 pb-6">
                <label className="mb-2 flex items-start gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 size-4 accent-[#F5C518] shrink-0"
                  />
                  <span className="text-[10.5px] leading-snug text-[#101418]/80">
                    קראתי ואני מאשר את <a href="/terms" target="_blank" rel="noopener" className="font-bold underline">תנאי השירות</a> ו<a href="/privacy" target="_blank" rel="noopener" className="font-bold underline">מדיניות הפרטיות</a>.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => (isGuestMode && !profile.phone ? openGuestDialog() : submit.mutate())}
                  disabled={submit.isPending || !!missingReason}
                  className={`group relative w-full overflow-hidden inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white text-base font-black transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${ready ? "bg-gradient-to-b from-[#6B8F71] to-[#557259] shadow-[0_10px_28px_-8px_rgba(85,114,89,0.75)] hover:shadow-[0_14px_32px_-8px_rgba(85,114,89,0.9)] animate-claim-pulse" : "bg-[#6B8F71]/80 shadow-[0_4px_16px_-4px_rgba(85,114,89,0.4)]"}`}
                >
                  {ready && !submit.isPending && (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-claim-shine" />
                  )}
                  {submit.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Radar className="size-5" />
                      <span className="tracking-tight">{ctaLabel}</span>
                    </>
                  )}
                </button>

                <p className={`text-center text-[11px] mt-1.5 ${missingReason ? "font-bold text-[#101418]/60" : "font-semibold text-[#101418]/55"}`}>
                  {missingReason ?? "לחיצה תשגר את ההזמנה למובילים באזור"}
                </p>
              </div>
            );
          })()}

        </div>
        )}

        {expanded && (() => {
          const munchReady = isMunch && !!munchStoreName.trim() && !!munchList.trim();
          if (isMunch && !munchReady) return null;
          const missingReason = !canContinue
            ? (!pickup ? "בחר נקודת איסוף כדי להמשיך" : !dropoff ? "בחר יעד כדי להמשיך" : "הוסף מספר טלפון כדי להמשיך")
            : !termsAccepted ? "סמן את אישור תנאי השירות"
            : null;
          const ctaLabel = isMunch
            ? "המשך להזמנה"
            : isMove
            ? (rule?.payment_mode === "cash_only" ? "שלח הזמנה למובילים" : "מצא לי מוביל עכשיו")
            : (rule?.payment_mode === "cash_only" ? "שלח הזמנה לשליחים" : "מצא לי שליח עכשיו");
          const ready = !missingReason;
          // Inline CTA (appears only at end of scroll) for all non-munch services.
          // Munch keeps sticky footer.
          const inlineCta = !isMunch;
          const wrapperClass = inlineCta
            ? "px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            : "flex-shrink-0 border-t border-black/5 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_26px_-18px_rgba(0,0,0,0.55)]";
          const ctaNode = (
            <div className={wrapperClass}>
              <label className="mb-2 flex items-start gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#F5C518] shrink-0"
                />
                <span className="text-[10.5px] leading-snug text-[#101418]/80">
                  קראתי ואני מאשר את <a href="/terms" target="_blank" rel="noopener" className="font-bold underline">תנאי השירות</a> ו<a href="/privacy" target="_blank" rel="noopener" className="font-bold underline">מדיניות הפרטיות</a>.
                </span>
              </label>

              <button
                type="button"
                onClick={() => (isGuestMode && !profile.phone ? openGuestDialog() : submit.mutate())}
                disabled={submit.isPending || !!missingReason}
                className={`group relative w-full overflow-hidden inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white text-base font-black transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${ready ? "bg-gradient-to-b from-[#6B8F71] to-[#557259] shadow-[0_10px_28px_-8px_rgba(85,114,89,0.75)] hover:shadow-[0_14px_32px_-8px_rgba(85,114,89,0.9)] animate-claim-pulse" : "bg-[#6B8F71]/80 shadow-[0_4px_16px_-4px_rgba(85,114,89,0.4)]"}`}
              >
                {ready && !submit.isPending && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-claim-shine" />
                )}
                {submit.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <Radar className="size-5" />
                    <span className="tracking-tight">{ctaLabel}</span>
                  </>
                )}

              </button>

              <p className={`text-center text-[11px] mt-1.5 ${missingReason ? "font-bold text-[#101418]/60" : "font-semibold text-[#101418]/55"}`}>
                {missingReason ?? "לחיצה תשגר את ההזמנה למובילים באזור"}
              </p>
            </div>
          );
          return inlineCta ? null : ctaNode;
        })()}




      </div>

      {munchComingSoonOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm grid place-items-center px-5"
          onClick={() => setMunchComingSoonOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 inline-flex items-baseline gap-1">
              <span
                className="text-[32px] font-black italic tracking-tight leading-none"
                style={{ color: "#FF6A1A", textShadow: "0 2px 0 rgba(229,72,10,0.18)" }}
              >
                munch
              </span>
              <span className="text-[12px] font-bold text-[#101418]/60 leading-none">by GOI</span>
            </div>
            <div className="mx-auto mb-3 inline-block px-3 py-1 rounded-full bg-[#101418] text-white text-[11px] font-black tracking-wide">
              בהרצה — בקרוב אצלכם
            </div>
            <h2 className="text-[18px] font-black text-[#101418] leading-tight">
              השירות עדיין בהרצה
            </h2>
            <p className="text-[13px] text-[#101418]/70 leading-snug mt-2">
              בקרוב תוכלו להזמין מהקיוסקים, המכולות וחנויות הנוחות הקרובות לביתכם — הישר עד הדלת.
            </p>
            <button
              type="button"
              onClick={() => setMunchComingSoonOpen(false)}
              className="mt-4 w-full py-3 rounded-2xl bg-[#101418] text-white font-black text-sm active:scale-[0.98]"
            >
              הבנתי
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- helpers to keep categories separate from notes inside description --- */
function categoryTokens(desc: string): string[] {
  const known = ALL_MOVE_CATEGORIES.map((c) => c.key);
  return desc.split("|").map((s) => s.trim())[0]?.split(/,\s*/).filter((t) => known.includes(t)) ?? [];
}
function extraNotes(desc: string): string {
  const parts = desc.split("|");
  return (parts[1] ?? "").trim();
}
function withNotes(desc: string, notes: string): string {
  const cats = categoryTokens(desc).join(", ");
  return notes ? `${cats} | ${notes}` : cats;
}
function withCats(desc: string, cats: string[]): string {
  const notes = extraNotes(desc);
  const cs = cats.join(", ");
  return notes ? `${cs} | ${notes}` : cs;
}

/* Single-select chip row used across the mover detail fields */
function ChipRow({
  label,
  options,
  value,
  onChange,
  cols = 3,
}: {
  label: string;
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  cols?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">{label}</label>
      <div className={`grid gap-1.5 ${cols === 4 ? "grid-cols-4" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(active ? "" : opt.key)}
              className={`py-2 px-1 rounded-xl text-[11px] font-black transition ${
                active
                  ? "bg-[#E7F6EC] text-[#0E7A4A] border-2 border-[#0E7A4A]"
                  : "bg-[#f5f6f8] text-[#101418]/70 border-2 border-transparent"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function MoveItemChips({ items, setItems, serviceId }: { items: ItemRow[]; setItems: Dispatch<SetStateAction<ItemRow[]>>; serviceId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const categories = useMemo(() => getMoveCategories(serviceId), [serviceId]);
  const qtyOf = (label: string) => items.find((i) => i.label === label)?.qty ?? 0;
  const bump = (label: string, delta: 1 | -1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.label === label);
      if (idx === -1) {
        if (delta < 0) return prev;
        return [...prev, { label, qty: 1 }];
      }
      const nextQty = prev[idx].qty + delta;
      if (nextQty <= 0) return prev.filter((_, i) => i !== idx);
      return prev.map((r, i) => (i === idx ? { ...r, qty: nextQty } : r));
    });
  };
  const submitCustom = () => {
    const trimmed = customText.trim().slice(0, 60);
    if (!trimmed) { setCustomOpen(false); return; }
    setItems((prev) => {
      if (prev.some((i) => i.label === trimmed)) {
        return prev.map((r) => (r.label === trimmed ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { label: trimmed, qty: 1 }];
    });
    setCustomText("");
    setCustomOpen(false);
  };

  const COLLAPSED_COUNT = 9;
  const visible = expanded
    ? categories
    : categories.filter((c, i) => i < COLLAPSED_COUNT || qtyOf(c.key) > 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {visible.map(({ key, label, icon: Icon }) => {
          const qty = qtyOf(key);
          const on = qty > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (qty === 0) bump(key, 1);
                else setItems((prev) => prev.filter((r) => r.label !== key));
              }}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-2 px-1 border-2 transition active:scale-95 select-none ${
                on
                  ? "border-[#22C55E] bg-[#E8F7EE] text-[#101418]"
                  : "border-transparent bg-[#f5f6f8] text-[#101418]/60"
              }`}
            >
              {on && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#101418] text-white text-[10px] font-black grid place-items-center shadow-md ring-2 ring-white">
                  {qty}
                </span>
              )}
              <Icon className={`size-5 ${on ? "text-[#166534]" : ""}`} strokeWidth={2} />
              <span className="text-[10px] font-bold leading-tight text-center">{label}</span>
            </button>
          );
        })}
        {!expanded && categories.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 border-2 border-dashed border-black/20 bg-white text-[#101418]/70 transition active:scale-95"
          >
            <MoreHorizontal className="size-5" strokeWidth={2} />
            <span className="text-[10px] font-bold leading-tight text-center">עוד…</span>
          </button>
        )}
        {expanded && (
          <>
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 px-1 border-2 border-dashed transition active:scale-95 ${
                customOpen ? "border-[#22C55E] bg-[#E8F7EE] text-[#101418]" : "border-black/20 bg-white text-[#101418]/70"
              }`}
            >
              <MoreHorizontal className="size-5" strokeWidth={2} />
              <span className="text-[10px] font-bold leading-tight text-center">אחר…</span>
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 border-2 border-transparent bg-[#f5f6f8] text-[#101418]/70 transition active:scale-95"
            >
              <span className="text-[10px] font-bold leading-tight text-center">סגור</span>
            </button>
          </>
        )}
      </div>
      {customOpen && (
        <div className="flex gap-1.5">
          <input
            type="text"
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitCustom(); } }}
            placeholder="שם הפריט (למשל: כספת, מגלשת ילדים)"
            className="flex-1 rounded-xl border-2 border-[#22C55E] bg-white px-3 py-2 text-[13px] outline-none"
            maxLength={60}
          />
          <button
            type="button"
            onClick={submitCustom}
            className="rounded-xl bg-[#22C55E] px-4 py-2 text-[12px] font-black text-white active:scale-95"
          >
            הוסף
          </button>
        </div>
      )}
    </div>
  );
}

function FloorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#101418]/60 uppercase mb-1.5">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0 = קרקע"
        className="w-full rounded-xl border border-black/10 bg-[#f5f6f8] px-3 py-2.5 text-sm font-semibold"
      />
    </div>
  );
}

function extractFloor(desc: string, which: "pickup" | "dropoff"): string {
  const notes = extraNotes(desc);
  const key = which === "pickup" ? "איסוף" : "מסירה";
  const m = notes.match(new RegExp(`קומה ${key}:\\s*(\\S+)`));
  return m?.[1] ?? "";
}

function setFloor(desc: string, which: "pickup" | "dropoff", floor: string): string {
  const notes = extraNotes(desc);
  const key = which === "pickup" ? "איסוף" : "מסירה";
  const re = new RegExp(`(^|;\\s*)קומה ${key}:\\s*\\S+`);
  let next = notes.replace(re, "").replace(/^;\s*/, "").trim();
  if (floor) next = next ? `${next}; קומה ${key}: ${floor}` : `קומה ${key}: ${floor}`;
  return withNotes(desc, next);
}

/* --- Searching radar sheet — polls the real job status; shows "found" only
       after a real courier claims the job on their panel. --- */
function SearchingSheet({
  created,
  pickup,
  dropoff,
  distanceKm,
  pricingModel,
  onFound,
  onBack,
}: {
  created: CreatedOrder;
  pickup?: SelectedPlace | null;
  dropoff?: SelectedPlace | null;
  distanceKm?: number | null;
  pricingModel?: "fixed_price" | "quote_request";
  onFound: () => void;
  onBack: () => void;
}) {
  const getStatus = useServerFn(getGuestJobStatusFn);
  const { data: status } = useQuery({
    queryKey: ["guest-job-status", created.job_id],
    queryFn: () => getStatus({ data: { job_id: created.job_id, tracking_token: created.tracking_token } }),
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });

  const found = !!status?.found;
  const courier = status?.courier ?? null;
  const matching = status?.matching_couriers_count ?? 0;
  const isQuotes = pricingModel === "quote_request";

  // Live mover quotes — top 3 by price / ETA / rating. A cheaper quote that
  // arrives later simply replaces a worse one as long as nothing was accepted.
  const getQuotes = useServerFn(getGuestJobQuotesFn);
  const selectQuote = useServerFn(selectGuestJobQuoteFn);
  const { data: quoteData, refetch: refetchQuotes } = useQuery({
    queryKey: ["guest-job-quotes", created.job_id],
    queryFn: () => getQuotes({ data: { job_id: created.job_id, tracking_token: created.tracking_token } }),
    refetchInterval: found ? false : 3000,
    refetchIntervalInBackground: true,
  });
  const quotes = (quoteData?.quotes ?? []) as Array<{
    id: string; price: number; eta_minutes: number | null; note: string | null;
    courier_name: string; courier_image: string | null; vehicle_type: string | null;
    rating: number; completed_jobs: number;
  }>;
  const [picking, setPicking] = useState<string | null>(null);
  const [detailQuote, setDetailQuote] = useState<(typeof quotes)[number] | null>(null);

  const accept = async (quoteId: string) => {
    if (picking) return;
    setPicking(quoteId);
    try {
      await selectQuote({ data: { job_id: created.job_id, tracking_token: created.tracking_token, quote_id: quoteId } });
      await refetchQuotes();
      onFound();
    } catch (e: any) {
      toast.error(e?.message ?? "לא הצלחנו לאשר את ההצעה");
      setPicking(null);
    }
  };

  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => onFound(), 1600);
    return () => clearTimeout(t);
  }, [found, onFound]);


  return (
    <div className="fixed inset-0 bottom-16 md:bottom-0 flex flex-col bg-[#101418] text-white">
      {/* Live map on top so the user sees the pickup/dropoff pins */}
      <div className="relative h-[38%] min-h-[220px] overflow-hidden">
        <OrderMap pickup={pickup ?? null} dropoff={dropoff ?? null} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#101418]/10 via-transparent to-[#101418]" />
        <button onClick={onBack} className="absolute top-3 right-3 z-10 rounded-full bg-white/95 text-[#101418] text-xs font-bold px-3 py-1.5 shadow-lg inline-flex items-center gap-1">
          <ArrowRight className="size-3.5" /> צפייה בהזמנה
        </button>
        {distanceKm != null && (
          <div className="absolute top-3 left-3 z-10 rounded-full bg-[#F5C518] text-[#101418] text-xs font-black px-3 py-1.5 shadow-lg">
            {distanceKm.toFixed(1)} ק״מ
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-6 overflow-y-auto">
        {!found ? (
          quotes.length > 0 ? (
            <div className="w-full max-w-md py-4" dir="rtl">
              <h1 className="text-xl font-black text-center">
                {quotes.length === 1 ? "התקבלה הצעה!" : `${quotes.length} ההצעות הכי טובות`}
              </h1>
              <p className="text-white/60 text-xs mt-1 text-center">
                לפי מחיר, זמן הגעה ודירוג · ההצעות מתעדכנות בזמן אמת
              </p>
              <div className="mt-4 space-y-2.5">
                {quotes.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setDetailQuote(q)}
                    className="w-full rounded-2xl bg-white/[0.07] border border-white/10 p-3 flex items-center gap-3 text-right hover:bg-white/[0.12] transition"
                  >
                    <div className="relative shrink-0">
                      {q.courier_image ? (
                        <img src={q.courier_image} alt={q.courier_name} className="size-12 rounded-full object-cover" />
                      ) : (
                        <div className="size-12 rounded-full bg-white/10 grid place-items-center">
                          <Truck className="size-5 text-white/70" />
                        </div>
                      )}
                      {i === 0 && (
                        <span className="absolute -top-1 -right-1 rounded-full bg-[#F5C518] text-[#101418] text-[9px] font-black px-1.5 py-0.5">מומלץ</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{q.courier_name}</div>
                      <div className="text-[11px] text-white/60 mt-0.5">
                        ★ {q.rating.toFixed(1)}
                        {q.completed_jobs > 0 && <> · {q.completed_jobs} הובלות</>}
                        {q.eta_minutes != null && <> · מגיע בעוד {q.eta_minutes} דק׳</>}
                      </div>
                      {q.note && <div className="text-[11px] text-white/50 mt-0.5 truncate">{q.note}</div>}
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-lg font-black">₪{q.price.toFixed(0)}</div>
                      <span className="mt-1 inline-block rounded-xl bg-white/10 text-white text-[11px] font-bold px-3 py-1.5">
                        פרטים ←
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-[11px] mt-3 text-center">
                לחיצה על הצעה פותחת את פרטי המוביל · ממשיכים לאסוף הצעות נוספות…
              </p>
              <p className="text-white/40 text-[11px] mt-1 text-center">
                אפשר לצאת ולפתוח הזמנה נוספת — ההזמנה תמתין לך ב"פעילות".
              </p>
            </div>
          ) : (

            <>
              <div className="relative size-32 grid place-items-center mb-6">
                <div className="absolute inset-0 rounded-full bg-[#F5C518]/10 animate-ping" />
                <div className="absolute inset-3 rounded-full bg-[#F5C518]/20 animate-ping [animation-delay:200ms]" />
                <div className="absolute inset-6 rounded-full bg-[#F5C518]/30 animate-ping [animation-delay:400ms]" />
                <div className="relative size-16 rounded-full bg-[#F5C518] grid place-items-center shadow-2xl">
                  <Radar className="size-8 text-[#101418]" strokeWidth={2.4} />
                </div>
              </div>
              <h1 className="text-2xl font-black">
                {isQuotes ? "אוספים הצעות ממובילים…" : "מחפש מוביל זמין…"}
              </h1>
              <p className="text-white/60 text-sm mt-2 max-w-xs">
                {matching > 0
                  ? isQuotes
                    ? `ההזמנה נשלחה ל־${matching} מובילים. ממתינים להצעות.`
                    : `הצעה נשלחה ל־${matching} מובילים באזור. ממתינים לאישור.`
                  : "מפרסמים את ההזמנה שלך למובילים באזור."}
              </p>
              <div className="mt-6 bg-white/5 rounded-2xl px-4 py-3 text-xs text-white/70 inline-flex items-center gap-3">
                <span>הזמנה #{created.job_number}</span>
                {distanceKm != null && <span>· {distanceKm.toFixed(1)} ק״מ</span>}
                {!isQuotes && <span>· ₪{created.total_price.toFixed(0)}</span>}
              </div>
            </>
          )
        ) : (

          <>
            <div className="size-20 rounded-full bg-[#0E7A4A] grid place-items-center shadow-2xl mb-6">
              <CheckCircle2 className="size-10 text-white" strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl font-black">נמצא מוביל!</h1>
            {courier?.full_name ? (
              <p className="text-white/80 text-base font-semibold mt-2">{courier.full_name}</p>
            ) : null}
            <p className="text-white/60 text-sm mt-1 max-w-xs">מעביר אותך למסך המעקב…</p>
          </>
        )}
      </div>

      {/* Mover details — the customer chooses only from here */}
      {detailQuote && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-end md:items-center justify-center" onClick={() => setDetailQuote(null)}>
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-sm bg-white text-[#101418] rounded-t-3xl md:rounded-3xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              {detailQuote.courier_image ? (
                <img src={detailQuote.courier_image} alt={detailQuote.courier_name} className="size-14 rounded-full object-cover" />
              ) : (
                <div className="size-14 rounded-full bg-black/5 grid place-items-center"><Truck className="size-6" /></div>
              )}
              <div className="min-w-0">
                <div className="font-extrabold text-base truncate">{detailQuote.courier_name}</div>
                <div className="text-xs text-[#101418]/60 mt-0.5">
                  ★ {detailQuote.rating.toFixed(1)}
                  {detailQuote.vehicle_type ? <> · {detailQuote.vehicle_type}</> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#f5f6f8] p-2.5">
                <div className="text-base font-black leading-none">{detailQuote.completed_jobs}</div>
                <div className="text-[10px] font-bold text-[#101418]/50 mt-1">הובלות</div>
              </div>
              <div className="rounded-xl bg-[#f5f6f8] p-2.5">
                <div className="text-base font-black leading-none">{detailQuote.eta_minutes != null ? `~${detailQuote.eta_minutes}׳` : "—"}</div>
                <div className="text-[10px] font-bold text-[#101418]/50 mt-1">זמן הגעה</div>
              </div>
              <div className="rounded-xl bg-[#f5f6f8] p-2.5">
                <div className="text-base font-black leading-none">{detailQuote.rating.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-[#101418]/50 mt-1">דירוג</div>
              </div>
            </div>

            {detailQuote.note && (
              <div className="rounded-xl bg-[#f5f6f8] p-3 text-sm text-[#101418]/80">"{detailQuote.note}"</div>
            )}

            <div className="rounded-xl bg-[#E6F7EF] p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#0E7A4A]">מחיר ההצעה</span>
              <span className="text-xl font-black text-[#0E7A4A]">₪{detailQuote.price.toFixed(0)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setDetailQuote(null)} className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-bold">
                חזרה להצעות
              </button>
              <button
                onClick={() => accept(detailQuote.id)}
                disabled={!!picking}
                className="flex-1 rounded-xl bg-[#0E7A4A] text-white py-2.5 text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {picking === detailQuote.id ? <Loader2 className="size-4 animate-spin" /> : null}
                בחר מוביל זה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}




function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#101418]/70">
      <span>{label}</span>
      <span className="font-bold text-[#101418]">{value}</span>
    </div>
  );
}

const PLACE_KINDS: { key: "building" | "ground" | "house" | "apartment" | "office"; label: string }[] = [
  { key: "building", label: "בניין" },
  { key: "ground", label: "קרקע" },
  { key: "apartment", label: "דירה" },
  { key: "house", label: "בית פרטי" },
  { key: "office", label: "משרד" },
];

function PlaceDetails({
  kind, setKind, floor, setFloor, apt, setApt, elevator, setElevator,
}: {
  kind: "" | "building" | "ground" | "house" | "apartment" | "office";
  setKind: (v: any) => void;
  floor: string; setFloor: (v: string) => void;
  apt: string; setApt: (v: string) => void;
  elevator: "" | "yes" | "no"; setElevator: (v: "" | "yes" | "no") => void;
}) {
  const showFloorApt = kind === "building" || kind === "apartment" || kind === "office";
  const isOffice = kind === "office";
  const showElevator = showFloorApt && floor.trim() !== "" && floor.trim() !== "0";
  return (
    <div className="pr-6 pl-1 -mt-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        {PLACE_KINDS.map((k) => {
          const on = kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(on ? "" : k.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                on ? "bg-[#101418] text-white" : "bg-black/5 text-[#101418]/70 hover:bg-black/10"
              }`}
            >
              {k.label}
            </button>
          );
        })}
        {showFloorApt && (
          <>
            <input
              type="text" inputMode="numeric" value={floor} onChange={(e) => setFloor(e.target.value)}
              placeholder="קומה"
              className="w-14 rounded-full bg-black/5 border-0 px-2.5 py-1 text-[11px] font-semibold text-[#101418] placeholder:text-[#101418]/40 outline-none focus:bg-black/10"
            />
            <input
              type="text" value={apt} onChange={(e) => setApt(e.target.value)}
              placeholder={isOffice ? "מס' משרד" : "דירה"}
              className="w-20 rounded-full bg-black/5 border-0 px-2.5 py-1 text-[11px] font-semibold text-[#101418] placeholder:text-[#101418]/40 outline-none focus:bg-black/10"
            />
          </>
        )}
        {showElevator && (
          <div className="inline-flex items-center gap-1 rounded-full bg-black/5 p-0.5">
            <button
              type="button"
              onClick={() => setElevator(elevator === "yes" ? "" : "yes")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                elevator === "yes" ? "bg-[#22C55E] text-white" : "text-[#101418]/70"
              }`}
            >
              עם מעלית
            </button>
            <button
              type="button"
              onClick={() => setElevator(elevator === "no" ? "" : "no")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                elevator === "no" ? "bg-[#101418] text-white" : "text-[#101418]/70"
              }`}
            >
              בלי מעלית
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtraStops({
  stops, setStops, isMove = false,
}: {
  stops: { place: SelectedPlace | null; text: string; name: string; phone: string }[];
  setStops: Dispatch<SetStateAction<{ place: SelectedPlace | null; text: string; name: string; phone: string }[]>>;
  isMove?: boolean;
}) {
  const add = () => setStops((p) => [...p, { place: null, text: "", name: "", phone: "" }]);
  const update = (i: number, patch: Partial<{ place: SelectedPlace | null; text: string; name: string; phone: string }>) =>
    setStops((p) => p.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const remove = (i: number) => setStops((p) => p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {stops.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded-2xl bg-black/[0.03] p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#101418]/60">יעד נוסף {i + 2}</span>
            <button type="button" onClick={() => remove(i)} className="text-[11px] font-bold text-[#B00020]">הסר</button>
          </div>
          <AddressAutocomplete
            label={`יעד ${i + 2}`}
            placeholder="כתובת מסירה"
            value={s.text}
            onChange={(v) => update(i, { text: v, place: v ? s.place : null })}
            onSelect={(p) => update(i, { place: p, text: p.address })}
            accent="red"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" value={s.name} onChange={(e) => update(i, { name: e.target.value })}
              placeholder="שם הנמען"
              className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 text-xs font-semibold"
            />
            <input
              type="tel" value={s.phone} onChange={(e) => update(i, { phone: e.target.value })}
              placeholder="טלפון"
              className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 text-xs font-semibold"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-black/20 text-[12px] font-bold text-[#101418]/70 hover:bg-black/5"
      >
        <Plus className="size-3.5" /> {stops.length === 0 ? (isMove ? "אותו מוביל, כמה יעדים" : "אותו שליח, כמה יעדים") : "הוסף עוד יעד"}
      </button>
    </div>
  );
}

