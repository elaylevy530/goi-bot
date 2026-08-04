// 3D-rendered illustration + gradient mapping for business delivery-type tiles.
// Keys correspond to DeliveryType.key entries in src/config/businessCategories.ts.

import imgFlowers from "@/assets/biz-tiles/flowers.png";
import imgPlant from "@/assets/biz-tiles/plant.png";
import imgGift from "@/assets/biz-tiles/gift.png";
import imgBalloons from "@/assets/biz-tiles/balloons.png";
import imgBag from "@/assets/biz-tiles/bag.png";
import imgParcel from "@/assets/biz-tiles/parcel.png";
import imgDocuments from "@/assets/biz-tiles/documents.png";
import imgCake from "@/assets/biz-tiles/cake.png";
import imgPet from "@/assets/biz-tiles/pet.png";
import imgClothes from "@/assets/biz-tiles/clothes.png";
import imgJewel from "@/assets/biz-tiles/jewel.png";
import imgPhone from "@/assets/biz-tiles/phone.png";
import imgLaptop from "@/assets/biz-tiles/laptop.png";
import imgBeauty from "@/assets/biz-tiles/beauty.png";
import imgMedicine from "@/assets/biz-tiles/medicine.png";
import imgBaby from "@/assets/biz-tiles/baby.png";
import imgTools from "@/assets/biz-tiles/tools.png";
import imgSofa from "@/assets/biz-tiles/sofa.png";
import imgTire from "@/assets/biz-tiles/tire.png";
import imgKeys from "@/assets/biz-tiles/keys.png";

export type TileTone = "amber" | "rose" | "green" | "blue" | "violet" | "orange" | "teal" | "slate" | "pink" | "indigo";

export type TileVisual = { image: string; tone: TileTone };

// Tailwind-safe class strings per tone.
export const TONE_STYLES: Record<TileTone, { bg: string; ring: string; glow: string; chip: string }> = {
  amber:  { bg: "from-[#FFF6D6] to-[#FFE79A]", ring: "ring-[#E9B308]/60",  glow: "#F5C518", chip: "bg-[#F5C518]/25 text-[#5A4200]" },
  rose:   { bg: "from-[#FFE4EC] to-[#FFC1D4]", ring: "ring-[#F472B6]/60",  glow: "#F472B6", chip: "bg-[#F472B6]/25 text-[#831843]" },
  green:  { bg: "from-[#DFF6E3] to-[#B7EAC1]", ring: "ring-[#22C55E]/60",  glow: "#22C55E", chip: "bg-[#22C55E]/20 text-[#14532D]" },
  blue:   { bg: "from-[#E1EEFF] to-[#B8D4FA]", ring: "ring-[#3B82F6]/60",  glow: "#3B82F6", chip: "bg-[#3B82F6]/20 text-[#1E3A8A]" },
  violet: { bg: "from-[#EFE4FF] to-[#D6BEFF]", ring: "ring-[#8B5CF6]/60",  glow: "#8B5CF6", chip: "bg-[#8B5CF6]/20 text-[#4C1D95]" },
  orange: { bg: "from-[#FFE7D1] to-[#FFC49A]", ring: "ring-[#F97316]/60",  glow: "#F97316", chip: "bg-[#F97316]/20 text-[#7C2D12]" },
  teal:   { bg: "from-[#D5F1EE] to-[#A7E1DA]", ring: "ring-[#14B8A6]/60",  glow: "#14B8A6", chip: "bg-[#14B8A6]/20 text-[#134E4A]" },
  slate:  { bg: "from-[#EEF1F5] to-[#D3DAE4]", ring: "ring-[#64748B]/60",  glow: "#64748B", chip: "bg-[#64748B]/20 text-[#0F172A]" },
  pink:   { bg: "from-[#FFE0EB] to-[#FFB1CE]", ring: "ring-[#EC4899]/60",  glow: "#EC4899", chip: "bg-[#EC4899]/20 text-[#831843]" },
  indigo: { bg: "from-[#E0E4FF] to-[#B7BEF7]", ring: "ring-[#6366F1]/60",  glow: "#6366F1", chip: "bg-[#6366F1]/20 text-[#312E81]" },
};

const MAP: Record<string, TileVisual> = {
  // Flowers / plants
  bouquet:            { image: imgFlowers, tone: "rose" },
  flowers:            { image: imgFlowers, tone: "rose" },
  big_arrangement:    { image: imgFlowers, tone: "pink" },
  arrangement:        { image: imgFlowers, tone: "pink" },
  gift_with_flowers:  { image: imgFlowers, tone: "pink" },
  flowers_box:        { image: imgFlowers, tone: "rose" },
  pot:                { image: imgPlant, tone: "green" },
  big_plant:          { image: imgPlant, tone: "green" },
  plants_pack:        { image: imgPlant, tone: "green" },
  nursery:            { image: imgPlant, tone: "green" },
  // Gifts / events
  gift:               { image: imgGift, tone: "pink" },
  gifts:              { image: imgGift, tone: "pink" },
  box:                { image: imgParcel, tone: "amber" },
  kit:                { image: imgGift, tone: "amber" },
  event_kit:          { image: imgGift, tone: "pink" },
  case:               { image: imgParcel, tone: "slate" },
  balloons:           { image: imgBalloons, tone: "violet" },
  balloons_events:    { image: imgBalloons, tone: "violet" },
  // Bags / shopping
  bag:                { image: imgBag, tone: "orange" },
  shopping_bag:       { image: imgBag, tone: "orange" },
  products_bag:       { image: imgBag, tone: "amber" },
  clothes_bag:        { image: imgBag, tone: "indigo" },
  big_order:          { image: imgBag, tone: "orange" },
  // Parcels / generic products
  parcel:             { image: imgParcel, tone: "blue" },
  product:            { image: imgParcel, tone: "amber" },
  big_product:        { image: imgParcel, tone: "slate" },
  other:              { image: imgParcel, tone: "slate" },
  general:            { image: imgParcel, tone: "slate" },
  local_store:        { image: imgParcel, tone: "amber" },
  social_shop:        { image: imgParcel, tone: "rose" },
  // Docs / office / legal
  docs:               { image: imgDocuments, tone: "slate" },
  documents:          { image: imgDocuments, tone: "slate" },
  printed:            { image: imgDocuments, tone: "indigo" },
  sign:               { image: imgDocuments, tone: "amber" },
  print:              { image: imgDocuments, tone: "indigo" },
  file:               { image: imgDocuments, tone: "amber" },
  contract:           { image: imgDocuments, tone: "slate" },
  envelope:           { image: imgDocuments, tone: "blue" },
  law:                { image: imgDocuments, tone: "slate" },
  accountant:         { image: imgDocuments, tone: "slate" },
  office:             { image: imgDocuments, tone: "slate" },
  book:               { image: imgDocuments, tone: "amber" },
  books:              { image: imgDocuments, tone: "amber" },
  keys:               { image: imgKeys, tone: "amber" },
  // Bakery
  cake:               { image: imgCake, tone: "pink" },
  bakery:             { image: imgCake, tone: "amber" },
  pastries:           { image: imgCake, tone: "amber" },
  // Pets
  pets:               { image: imgPet, tone: "orange" },
  food_bag:           { image: imgPet, tone: "orange" },
  pet_equipment:      { image: imgPet, tone: "amber" },
  cage:               { image: imgPet, tone: "teal" },
  bed:                { image: imgPet, tone: "blue" },
  // Clothes
  clothes:            { image: imgClothes, tone: "indigo" },
  few_items:          { image: imgClothes, tone: "violet" },
  // Jewelry
  jewel:              { image: imgJewel, tone: "violet" },
  jewelry:            { image: imgJewel, tone: "violet" },
  // Phone / electronics
  phone:              { image: imgPhone, tone: "blue" },
  mobile:             { image: imgPhone, tone: "blue" },
  accessories:        { image: imgPhone, tone: "slate" },
  tablet:             { image: imgPhone, tone: "indigo" },
  tv:                 { image: imgLaptop, tone: "slate" },
  screen:             { image: imgLaptop, tone: "indigo" },
  computer:           { image: imgLaptop, tone: "blue" },
  computers:          { image: imgLaptop, tone: "blue" },
  electronics:        { image: imgLaptop, tone: "indigo" },
  gear:               { image: imgLaptop, tone: "slate" },
  technicians:        { image: imgTools, tone: "slate" },
  assembly:           { image: imgTools, tone: "slate" },
  // Beauty / pharm
  beauty:             { image: imgBeauty, tone: "pink" },
  cosmetics:          { image: imgBeauty, tone: "pink" },
  perfume:            { image: imgBeauty, tone: "rose" },
  medicine:           { image: imgMedicine, tone: "teal" },
  medical:            { image: imgMedicine, tone: "teal" },
  pharmacy:           { image: imgMedicine, tone: "teal" },
  clinic:             { image: imgMedicine, tone: "teal" },
  // Baby / toys
  baby:               { image: imgBaby, tone: "blue" },
  diapers:            { image: imgBaby, tone: "blue" },
  toys:               { image: imgBaby, tone: "orange" },
  // Hardware / tools
  tools:              { image: imgTools, tone: "slate" },
  hardware:           { image: imgTools, tone: "orange" },
  materials:          { image: imgTools, tone: "orange" },
  equipment:          { image: imgTools, tone: "green" },
  sacks:              { image: imgParcel, tone: "orange" },
  // Furniture / design
  chair:              { image: imgSofa, tone: "amber" },
  table:              { image: imgSofa, tone: "amber" },
  sofa:               { image: imgSofa, tone: "rose" },
  cabinet:            { image: imgSofa, tone: "slate" },
  furniture:          { image: imgSofa, tone: "amber" },
  decor:              { image: imgSofa, tone: "pink" },
  home_design:        { image: imgSofa, tone: "pink" },
  // Garage
  tire:               { image: imgTire, tone: "slate" },
  spare:              { image: imgTire, tone: "slate" },
  garage:             { image: imgTire, tone: "slate" },
};

const FALLBACK: TileVisual = { image: imgParcel, tone: "amber" };

export function getTileVisual(key: string): TileVisual {
  return MAP[key] ?? FALLBACK;
}
