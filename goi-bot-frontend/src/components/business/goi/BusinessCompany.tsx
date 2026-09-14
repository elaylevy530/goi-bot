import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileText,
  Hash,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plug,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Choices,
  DataTable,
  Modal,
  Panel,
  SaveBar,
  SearchBox,
  SelectBox,
  Toggle,
  money,
} from "@/components/business/goi/GoiUi";
import { LiveJobsMap } from "@/components/business/LiveJobsMap";
import { useMyBusiness } from "@/components/BusinessShell";
import { BusinessLogo } from "@/components/BusinessLogo";
import { nestUpdateMyCustomer } from "@/lib/nest-accounts";
import { nestUploadFile } from "@/lib/nest-files";
import { BUSINESS_CATEGORIES } from "@/config/businessCategories";
import {
  nestCreateBranch,
  nestDeleteBranch,
  nestGetPricing,
  nestInviteTeamMember,
  nestListMyBranches,
  nestListTeamMembers,
  nestSetDefaultBranch,
  nestDeleteTeamMember,
  nestUpdateBranch,
} from "@/lib/nest-domain";

export const COMPANY_SECTIONS = [
  { id: "profile", title: "פרטי העסק", desc: "עדכון פרטי העסק, פרטי קשר וכתובת ראשית", icon: Building2, action: "עדכן פרטים" },
  { id: "pricing", title: "תמחור משלוחים", desc: "בחר מסלול תמחור וקבע את המחירים האוטומטיים לעסק", icon: Tag, action: "נהל תמחור" },
  { id: "items", title: "פריטי משלוח שמורים", desc: "נהל את הפריטים שהעסק שולח וחסוך זמן בהזמנה", icon: Package, action: "נהל פריטים" },
  { id: "delivery", title: "אישור מסירה", desc: "בחר איך יאשר השליח שהמשלוח הגיע ליעדו", icon: ClipboardCheck, action: "נהל אישור מסירה" },
  { id: "team", title: "צוות והרשאות", desc: "הוסף אנשי צוות וקבע מי יכול לנהל הזמנות והגדרות", icon: Users, action: "נהל צוות" },
  { id: "integrations", title: "אינטגרציות וחיבורים", desc: "חבר מערכות הזמנות ומקורות חיצוניים לעסק", icon: Plug, action: "נהל אינטגרציות", route: "/business/integrations" },
] as const;

export type CompanySectionId = (typeof COMPANY_SECTIONS)[number]["id"];

type Niche = Record<string, unknown>;
type PricingModel = "distance_based" | "fixed_price" | "city_radius";
type PricingZone = { id: string; city: string; radius_km: string; fixed_price: string };

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function nicheOf(me: Record<string, unknown> | null | undefined): Niche {
  return ((me?.niche_details as Niche) || {}) as Niche;
}

export function BusinessCompany({ section }: { section?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const meta = COMPANY_SECTIONS.find((s) => s.id === section);
  const niche = nicheOf(me as Record<string, unknown>);
  const saveNiche = useMutation({
    mutationFn: async (patch: Niche) => {
      await nestUpdateMyCustomer({ niche_details: patch });
    },
    onSuccess: () => {
      toast.success("השינויים נשמרו");
      qc.invalidateQueries({ queryKey: ["business-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveProfile = useMutation({
    mutationFn: async (body: Record<string, unknown>) => nestUpdateMyCustomer(body),
    onSuccess: (updated) => {
      qc.setQueryData(["business-me"], updated);
      toast.success("השינויים נשמרו");
      qc.invalidateQueries({ queryKey: ["business-me"], refetchType: "none" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!section) {
    return (
      <div className="business-page">
        <div className="screen-heading">
          <div>
            <h1>
              העסק שלי <span className="heading-icon"><Store size={24} /></span>
            </h1>
            <p>נהל את כל הגדרות העסק שלך במקום אחד</p>
          </div>
        </div>
        <div className="business-grid">
          {COMPANY_SECTIONS.map((s) => (
            <Link
              key={s.id}
              className="business-tile panel"
              to={(("route" in s ? s.route : "/business/company/$section") as never)}
              params={{ section: s.id } as never}
            >
              <span className="round-icon">
                <s.icon size={27} />
              </span>
              <h2>{s.title}</h2>
              <p>{s.desc}</p>
              <span className="link">
                {s.action} <ChevronLeft size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="business-page">
      <div className="screen-heading">
        <div>
          <h1>
            {meta?.title || "העסק שלי"}{" "}
            <span className="heading-icon">{meta ? <meta.icon size={24} /> : <Store size={24} />}</span>
          </h1>
          <p>
            <button type="button" className="link" onClick={() => navigate({ to: "/business/account" })}>
              העסק שלי
            </button>
            <ChevronLeft size={12} />
            {meta?.title}
          </p>
        </div>
      </div>
      {section === "profile" && <ProfileSection me={me} saving={saveProfile.isPending} onSave={(body) => saveProfile.mutate(body)} />}
      {section === "branches" && <BranchesSection />}
      {section === "pricing" && (
        <PricingSection
          me={me}
          saving={saveProfile.isPending}
          onSave={(body) => saveProfile.mutateAsync(body)}
        />
      )}
      {section === "items" && <ItemsSection niche={niche} saving={saveNiche.isPending} onSave={(items) => saveNiche.mutate({ saved_items: items })} />}
      {section === "hours" && <HoursSection niche={niche} saving={saveNiche.isPending} onSave={(hours) => saveNiche.mutate({ operating_hours: hours })} />}
      {section === "pickup" && <PickupSection me={me} niche={niche} saving={saveProfile.isPending || saveNiche.isPending} onSaveProfile={(b) => saveProfile.mutate(b)} onSaveNiche={(n) => saveNiche.mutate(n)} />}
      {section === "cash" && <CashSection niche={niche} saving={saveNiche.isPending} onSave={(cash) => saveNiche.mutate({ cash })} />}
      {section === "delivery" && <DeliverySection niche={niche} saving={saveNiche.isPending} onSave={(proof) => saveNiche.mutate({ proof })} />}
      {section === "notes" && <NotesSection me={me} saving={saveProfile.isPending} onSave={(body) => saveProfile.mutate(body)} />}
      {section === "defaults" && <DefaultsSection me={me} niche={niche} saving={saveNiche.isPending} onSave={(defaults) => saveNiche.mutate({ defaults })} />}
      {section === "team" && <TeamSection />}
      {section === "zones" && <ZonesSection niche={niche} saving={saveNiche.isPending} onSave={(zones) => saveNiche.mutate({ service_zones: zones })} />}
      {section === "status" && <StatusSection me={me} niche={niche} saving={saveNiche.isPending || saveProfile.isPending} onSaveNiche={(n) => saveNiche.mutate(n)} onSaveProfile={(b) => saveProfile.mutate(b)} />}
    </div>
  );
}

function ProfileSection({
  me,
  saving,
  onSave,
}: {
  me: any;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [f, setF] = useState({
    business_name: "",
    business_category: "",
    business_tax_id: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pickup_contact_name: "",
    pickup_contact_phone: "",
    logo_url: "",
    vehicle_groups: ["two_wheel", "four_wheel"] as string[],
  });
  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("יש לבחור קובץ תמונה");
      if (file.size > 8 * 1024 * 1024) throw new Error("גודל הלוגו יכול להיות עד 8MB");
      const uploaded = await nestUploadFile("business-logos", file);
      const updated = await nestUpdateMyCustomer({ logo_url: uploaded.path });
      return { path: uploaded.path, updated };
    },
    onSuccess: ({ path, updated }) => {
      setF((current) => ({ ...current, logo_url: path }));
      qc.setQueryData(["business-me"], updated);
      qc.invalidateQueries({ queryKey: ["business-logo-signed", path] });
      toast.success("הלוגו עודכן");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  useEffect(() => {
    if (!me) return;
    const defaults = (me.niche_details?.defaults || {}) as {
      vehicle?: string;
      vehicle_groups?: string[];
    };
    const savedGroups = Array.isArray(defaults.vehicle_groups) ? defaults.vehicle_groups : [];
    const vehicleGroups = savedGroups.length
      ? savedGroups
      : defaults.vehicle === "רכב" || defaults.vehicle === "רכב מסחרי"
        ? ["four_wheel"]
        : defaults.vehicle && defaults.vehicle !== "אוטומטי"
          ? ["two_wheel"]
          : ["two_wheel", "four_wheel"];
    setF({
      business_name: me.business_name || me.name || "",
      business_category: me.business_category || me.customer_type || "",
      business_tax_id: me.business_tax_id || "",
      email: me.email || "",
      phone: me.phone || "",
      address: me.address || "",
      city: me.city || "",
      pickup_contact_name: me.pickup_contact_name || me.business_name || me.name || "",
      pickup_contact_phone: me.pickup_contact_phone || me.phone || "",
      logo_url: me.logo_url || "",
      vehicle_groups: vehicleGroups,
    });
  }, [me]);
  return (
    <div className="business-profile-grid">
      <div className="profile-main">
        <Panel title="פרטים בסיסיים" icon={<Pencil size={17} />}>
          <div className="business-logo-editor">
            <BusinessLogo path={f.logo_url} name={f.business_name} size={76} />
            <div>
              <strong>לוגו העסק</strong>
              <p>הלוגו יוצג לשליחים לצד המשלוחים של העסק.</p>
              <button
                type="button"
                disabled={uploadLogo.isPending}
                onClick={() => logoInputRef.current?.click()}
              >
                <Camera size={16} />
                {uploadLogo.isPending ? "מעלה…" : f.logo_url ? "החלפת לוגו" : "העלאת לוגו"}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadLogo.mutate(file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="field-grid">
            <label className="field">שם העסק<input value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></label>
            <label className="field">
              סוג העסק
              <SelectBox
                label="סוג העסק"
                value={f.business_category}
                onChange={(value) => setF({ ...f, business_category: value })}
                options={[
                  ...(BUSINESS_CATEGORIES.some((category) => category.key === f.business_category) || !f.business_category
                    ? []
                    : [{ value: f.business_category, label: f.business_category }]),
                  ...BUSINESS_CATEGORIES.map((category) => ({
                    value: category.key,
                    label: `${category.emoji} ${category.label}`,
                  })),
                ]}
              />
            </label>
            <label className="field">ח.פ / עוסק<input value={f.business_tax_id} onChange={(e) => setF({ ...f, business_tax_id: e.target.value })} /></label>
            <label className="field">פלאפון<input type="tel" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
            <label className="field">אימייל<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            <label className="field">עיר<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          </div>
        </Panel>
        <Panel title="הגדרות איסוף ומשלוח" icon={<MapPin size={18} />}>
          <label className="field">
            כתובת איסוף ראשית
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="רחוב, מספר ועיר" />
            <small className="hint">כל משלוח חדש ייצא מכתובת זו. שינוי הכתובת יעדכן את נקודת האיסוף הקבועה.</small>
          </label>
          <div className="field-grid">
            <label className="field">איש קשר באיסוף<input value={f.pickup_contact_name} onChange={(e) => setF({ ...f, pickup_contact_name: e.target.value })} /></label>
            <label className="field">טלפון באיסוף<input type="tel" dir="ltr" value={f.pickup_contact_phone} onChange={(e) => setF({ ...f, pickup_contact_phone: e.target.value })} /></label>
          </div>
          <h3>אמצעי משלוח מתאימים לעסק</h3>
          <p className="hint">המערכת תבחר שליח מתוך הקבוצות שסומנו בהתאם לגודל המשלוח.</p>
          <div className="vehicle-group-choices" role="group" aria-label="אמצעי משלוח מתאימים">
            <button
              type="button"
              className={f.vehicle_groups.length === 2 ? "is-selected" : undefined}
              onClick={() => setF({ ...f, vehicle_groups: ["two_wheel", "four_wheel"] })}
            >
              הכל
            </button>
            {[
              ["two_wheel", "דו־גלגלי", "אופניים, קורקינט וקטנוע"],
              ["four_wheel", "4 גלגלים", "רכב ורכב מסחרי"],
            ].map(([value, title, description]) => {
              const selected = f.vehicle_groups.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  className={selected ? "is-selected" : undefined}
                  onClick={() => {
                    const next = selected
                      ? f.vehicle_groups.filter((group) => group !== value)
                      : [...f.vehicle_groups, value];
                    setF({ ...f, vehicle_groups: next.length ? next : [value] });
                  }}
                >
                  <strong>{title}</strong>
                  <small>{description}</small>
                </button>
              );
            })}
          </div>
        </Panel>
        <SaveBar
          saving={saving}
          onSave={() => {
            const defaults = (me?.niche_details?.defaults || {}) as Record<string, unknown>;
            const defaultVehicle =
              f.vehicle_groups.length === 2
                ? "אוטומטי"
                : f.vehicle_groups.includes("four_wheel")
                  ? "רכב"
                  : "קטנוע";
            onSave({
              business_name: f.business_name,
              business_category: f.business_category,
              business_tax_id: f.business_tax_id,
              email: f.email,
              phone: f.phone,
              address: f.address,
              city: f.city,
              pickup_address: f.address,
              pickup_contact_name: f.pickup_contact_name,
              pickup_contact_phone: f.pickup_contact_phone,
              logo_url: f.logo_url || null,
              niche_details: {
                defaults: {
                  ...defaults,
                  vehicle: defaultVehicle,
                  vehicle_groups: f.vehicle_groups,
                },
              },
            });
          }}
        />
      </div>
      <Panel className="profile-summary">
        <div className="business-logo big">{(f.business_name || "?")[0]}</div>
        <h2>{f.business_name}</h2>
        <Badge text="פעיל" tone="green" />
        <dl>
          <dt><MapPin size={17} />סניף ראשי</dt>
          <dd>{f.address}, {f.city}</dd>
          <dt><Tag size={17} />קטגוריה</dt>
          <dd>{BUSINESS_CATEGORIES.find((category) => category.key === f.business_category)?.label || f.business_category || "—"}</dd>
          <dt><Phone size={17} />טלפון</dt>
          <dd dir="ltr">{f.phone || "—"}</dd>
          <dt><Mail size={17} />אימייל</dt>
          <dd>{f.email || "—"}</dd>
        </dl>
      </Panel>
    </div>
  );
}

function BranchesSection() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ id?: string; branch_name: string; full_address: string; city: string; phone: string } | null>(null);
  const { data: branches = [] } = useQuery({
    queryKey: ["business-branches", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListMyBranches() as Promise<any[]>,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!editor) return;
      const body = { branch_name: editor.branch_name, full_address: editor.full_address, city: editor.city, phone: editor.phone };
      if (editor.id) await nestUpdateBranch(editor.id, body);
      else await nestCreateBranch(body);
    },
    onSuccess: () => {
      toast.success("הסניף נשמר");
      setEditor(null);
      qc.invalidateQueries({ queryKey: ["business-branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => nestDeleteBranch(id),
    onSuccess: () => { toast.success("הסניף נמחק"); qc.invalidateQueries({ queryKey: ["business-branches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const makeDefault = useMutation({
    mutationFn: (id: string) => nestSetDefaultBranch(id),
    onSuccess: () => { toast.success("סניף ברירת המחדל עודכן"); qc.invalidateQueries({ queryKey: ["business-branches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const filtered = branches.filter((b) => `${b.branch_name} ${b.city} ${b.full_address}`.includes(query));
  return (
    <>
      <div className="section-toolbar">
        <SearchBox value={query} onChange={setQuery} />
        <button type="button" className="btn primary" onClick={() => setEditor({ branch_name: "", full_address: "", city: "", phone: "" })}>
          <Plus size={16} />הוסף סניף חדש
        </button>
      </div>
      <div className="branch-list">
        {filtered.map((b) => (
          <Panel key={b.id} className="branch-card">
            <div className="branch-top">
              <div className="business-logo">{String(b.branch_name || "?")[0]}</div>
              <div>
                <h3>{b.branch_name}</h3>
                <p><MapPin />{b.full_address}, {b.city}</p>
                <p><Phone />{b.phone || "—"}</p>
              </div>
              <Badge text={b.is_default ? "ברירת מחדל" : "סניף"} tone={b.is_default ? "green" : "gray"} />
            </div>
            <div className="card-actions">
              <button type="button" onClick={() => setEditor({ id: b.id, branch_name: b.branch_name, full_address: b.full_address || "", city: b.city || "", phone: b.phone || "" })}><Pencil />ערוך</button>
              {!b.is_default && <button type="button" onClick={() => makeDefault.mutate(b.id)}>ברירת מחדל</button>}
              <button type="button" onClick={() => remove.mutate(b.id)}><Trash2 />מחק</button>
            </div>
          </Panel>
        ))}
        {filtered.length === 0 && <Panel className="empty-state">אין סניפים להצגה</Panel>}
      </div>
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "עריכת סניף" : "סניף חדש"} description="פרטי הסניף יוצגו לשליח באיסוף">
        {editor && (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <label className="field">שם הסניף<input required autoFocus value={editor.branch_name} onChange={(e) => setEditor({ ...editor, branch_name: e.target.value })} placeholder="למשל סניף מרכז" /></label>
            <div className="team-invite-fields">
              <label className="field">עיר<input value={editor.city} onChange={(e) => setEditor({ ...editor, city: e.target.value })} /></label>
              <label className="field">טלפון<input dir="ltr" value={editor.phone} onChange={(e) => setEditor({ ...editor, phone: e.target.value })} /></label>
            </div>
            <label className="field">כתובת<input value={editor.full_address} onChange={(e) => setEditor({ ...editor, full_address: e.target.value })} /></label>
            <SaveBar saving={save.isPending} onCancel={() => setEditor(null)} />
          </form>
        )}
      </Modal>
    </>
  );
}

function PricingSection({
  me,
  saving,
  onSave,
}: {
  me: Record<string, unknown> | null | undefined;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const { data: pricing } = useQuery({ queryKey: ["platform-pricing"], queryFn: nestGetPricing });
  const savedConfig = ((me?.niche_details as Niche | undefined)?.pricing_config ?? {}) as {
    model?: PricingModel;
    base_price?: number;
    price_per_km?: number;
    minimum_price?: number;
    fixed_price?: number;
    zones?: Array<{ id?: string; city?: string; radius_km?: number; fixed_price?: number }>;
  };
  const savedModel = String(me?.default_pricing_type || savedConfig.model || "distance_based") as PricingModel;
  const [model, setModel] = useState<PricingModel>(savedModel);
  const [basePrice, setBasePrice] = useState(String(savedConfig.base_price ?? pricing?.base_price ?? ""));
  const [pricePerKm, setPricePerKm] = useState(String(savedConfig.price_per_km ?? pricing?.price_per_km ?? ""));
  const [minimumPrice, setMinimumPrice] = useState(String(savedConfig.minimum_price ?? pricing?.minimum_price ?? ""));
  const [fixedPrice, setFixedPrice] = useState(String(me?.default_delivery_price ?? savedConfig.fixed_price ?? ""));
  const [zones, setZones] = useState<PricingZone[]>(
    (savedConfig.zones ?? []).map((zone) => ({
      id: zone.id || crypto.randomUUID(),
      city: zone.city || "",
      radius_km: String(zone.radius_km ?? ""),
      fixed_price: String(zone.fixed_price ?? ""),
    })),
  );

  useEffect(() => {
    setModel(savedModel);
    setBasePrice(String(savedConfig.base_price ?? pricing?.base_price ?? ""));
    setPricePerKm(String(savedConfig.price_per_km ?? pricing?.price_per_km ?? ""));
    setMinimumPrice(String(savedConfig.minimum_price ?? pricing?.minimum_price ?? ""));
    setFixedPrice(String(me?.default_delivery_price ?? savedConfig.fixed_price ?? ""));
    setZones(
      (savedConfig.zones ?? []).map((zone) => ({
        id: zone.id || crypto.randomUUID(),
        city: zone.city || "",
        radius_km: String(zone.radius_km ?? ""),
        fixed_price: String(zone.fixed_price ?? ""),
      })),
    );
    // Values are synchronized when the profile/server pricing query refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, pricing]);

  const save = async () => {
    const nonNegative = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
    if (
      model === "distance_based" &&
      (![basePrice, pricePerKm, minimumPrice].every(nonNegative) ||
        Number(basePrice) + Number(pricePerKm) <= 0)
    ) {
      toast.error("יש להזין תעריף בסיס ותוספת לק״מ תקינים");
      return;
    }
    if ((model === "fixed_price" || model === "city_radius") && (!nonNegative(fixedPrice) || Number(fixedPrice) <= 0)) {
      toast.error("יש להזין מחיר קבוע גדול מאפס");
      return;
    }
    if (
      model === "city_radius" &&
      zones.some(
        (zone) =>
          !zone.city.trim() ||
          !nonNegative(zone.radius_km) ||
          Number(zone.radius_km) <= 0 ||
          !nonNegative(zone.fixed_price) ||
          Number(zone.fixed_price) <= 0,
      )
    ) {
      toast.error("יש להשלים עיר, רדיוס ומחיר תקינים בכל אזור");
      return;
    }
    const cleanZones = zones
      .filter((zone) => zone.city.trim())
      .map((zone) => ({
        id: zone.id,
        city: zone.city.trim(),
        radius_km: Math.max(0, Number(zone.radius_km) || 0),
        fixed_price: Math.max(0, Number(zone.fixed_price) || 0),
      }));
    try {
      await onSave({
        default_pricing_type: model,
        default_delivery_price: model === "fixed_price" || model === "city_radius"
          ? Math.max(0, Number(fixedPrice) || 0)
          : null,
        niche_details: {
          pricing_config: {
            model,
            base_price: Math.max(0, Number(basePrice) || 0),
            price_per_km: Math.max(0, Number(pricePerKm) || 0),
            minimum_price: Math.max(0, Number(minimumPrice) || 0),
            fixed_price: Math.max(0, Number(fixedPrice) || 0),
            zones: cleanZones,
          },
        },
      });
    } catch {
      // The mutation displays the API error and keeps the edited values in place.
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Panel title="מסלול התמחור של העסק">
        <p className="hint">המחיר במסך יצירת משלוח יחושב אוטומטית לפי המסלול שנבחר כאן.</p>
        <div className="pricing-model-grid">
          {([
            ["distance_based", "בסיס + ק״מ", "מחיר בסיס ותוספת לכל קילומטר"],
            ["fixed_price", "מחיר קבוע", "אותו מחיר לכל המשלוחים"],
            ["city_radius", "עיר ורדיוס", "מחיר קבוע לפי עיר וטווח בק״מ"],
          ] as const).map(([value, title, description]) => (
            <button
              key={value}
              type="button"
              className={model === value ? "is-selected" : undefined}
              onClick={() => setModel(value)}
            >
              <strong>{title}</strong>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </Panel>

      {model === "distance_based" && (
        <Panel title="תעריף לפי מרחק">
          <div className="field-grid">
            <label className="field">מחיר בסיס (₪)<input required type="number" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} /></label>
            <label className="field">תוספת לכל ק״מ (₪)<input required type="number" min="0" step="0.01" value={pricePerKm} onChange={(e) => setPricePerKm(e.target.value)} /></label>
            <label className="field">מחיר מינימום (₪)<input required type="number" min="0" step="0.01" value={minimumPrice} onChange={(e) => setMinimumPrice(e.target.value)} /></label>
          </div>
          <p className="hint">דוגמה ל־5 ק״מ: {money(Math.max(Number(minimumPrice) || 0, (Number(basePrice) || 0) + 5 * (Number(pricePerKm) || 0)))}</p>
        </Panel>
      )}

      {model === "fixed_price" && (
        <Panel title="מחיר קבוע לכל משלוח">
          <label className="field">מחיר משלוח (₪)<input required type="number" min="0" step="0.01" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} /></label>
        </Panel>
      )}

      {model === "city_radius" && (
        <Panel title="מחירים לפי עיר ורדיוס">
          <label className="field pricing-fallback-price">
            מחיר ברירת מחדל מחוץ לאזורים (₪)
            <input required type="number" min="0" step="0.01" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} />
          </label>
          <div className="pricing-zones">
            {zones.map((zone) => (
              <div className="pricing-zone-row" key={zone.id}>
                <label className="field">עיר<input required value={zone.city} onChange={(e) => setZones((list) => list.map((item) => item.id === zone.id ? { ...item, city: e.target.value } : item))} placeholder="למשל תל אביב" /></label>
                <label className="field">רדיוס (ק״מ)<input required type="number" min="0" step="0.1" value={zone.radius_km} onChange={(e) => setZones((list) => list.map((item) => item.id === zone.id ? { ...item, radius_km: e.target.value } : item))} /></label>
                <label className="field">מחיר קבוע (₪)<input required type="number" min="0" step="0.01" value={zone.fixed_price} onChange={(e) => setZones((list) => list.map((item) => item.id === zone.id ? { ...item, fixed_price: e.target.value } : item))} /></label>
                <button type="button" className="icon-btn" aria-label="מחיקת אזור" onClick={() => setZones((list) => list.filter((item) => item.id !== zone.id))}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary" onClick={() => setZones((list) => [...list, { id: crypto.randomUUID(), city: "", radius_km: "", fixed_price: "" }])}>
            <Plus size={17} /> הוסף עיר ורדיוס
          </button>
        </Panel>
      )}
      <SaveBar saving={saving} onSave={save} />
    </form>
  );
}

function ItemsSection({ niche, saving, onSave }: { niche: Niche; saving: boolean; onSave: (items: any[]) => void }) {
  const items = (Array.isArray(niche.saved_items) ? niche.saved_items : []) as Array<{ id: string; name: string; weight: string; vehicle: string; quantity: number }>;
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ id?: string; name: string; weight: string; vehicle: string; quantity: string } | null>(null);
  const commit = () => {
    if (!editor?.name) return;
    const next = editor.id
      ? items.map((i) => (i.id === editor.id ? { ...i, name: editor.name, weight: editor.weight, vehicle: editor.vehicle, quantity: Number(editor.quantity) || 1 } : i))
      : [...items, { id: crypto.randomUUID(), name: editor.name, weight: editor.weight, vehicle: editor.vehicle, quantity: Number(editor.quantity) || 1 }];
    onSave(next);
    setEditor(null);
  };
  return (
    <>
      <div className="section-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="חיפוש לפי שם פריט..." />
        <button type="button" className="btn primary" onClick={() => setEditor({ name: "", weight: "עד 5 ק״ג", vehicle: "קטנוע", quantity: "1" })}>
          <Plus size={17} />הוסף פריט חדש
        </button>
      </div>
      <Panel title={`הפריטים השמורים שלי (${items.length})`}>
        <DataTable
          headers={["פריט", "משקל", "אמצעי משלוח", "כמות", "פעולות"]}
          rows={items.filter((i) => i.name.includes(query)).map((i) => [
            i.name,
            i.weight,
            i.vehicle,
            i.quantity,
            <div key="a" className="icon-actions">
              <button type="button" aria-label="עריכה" onClick={() => setEditor({ id: i.id, name: i.name, weight: i.weight, vehicle: i.vehicle, quantity: String(i.quantity) })}><Pencil /></button>
              <button type="button" aria-label="מחיקה" onClick={() => onSave(items.filter((x) => x.id !== i.id))}><Trash2 /></button>
            </div>,
          ])}
        />
      </Panel>
      <SaveBar saving={saving} onSave={() => onSave(items)} />
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "עריכת פריט משלוח" : "פריט משלוח חדש"} description="הפריט יישמר לשימוש חוזר בהזמנות הבאות">
        {editor && (
          <form onSubmit={(e) => { e.preventDefault(); commit(); }}>
            <label className="field">שם הפריט<input required autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="למשל מגש פיצה" /></label>
            <div className="team-invite-fields">
              <label className="field">משקל<SelectBox label="משקל" value={editor.weight} onChange={(v) => setEditor({ ...editor, weight: v })} options={["עד 5 ק״ג", "עד 10 ק״ג", "עד 20 ק״ג"]} /></label>
              <label className="field">רכב<SelectBox label="רכב" value={editor.vehicle} onChange={(v) => setEditor({ ...editor, vehicle: v })} options={["קטנוע", "רכב"]} /></label>
            </div>
            <label className="field">כמות<input type="number" min="1" value={editor.quantity} onChange={(e) => setEditor({ ...editor, quantity: e.target.value })} /></label>
            <SaveBar onCancel={() => setEditor(null)} />
          </form>
        )}
      </Modal>
    </>
  );
}

function HoursSection({ niche, saving, onSave }: { niche: Niche; saving: boolean; onSave: (hours: any) => void }) {
  const raw = (niche.operating_hours || {}) as Record<string, { open?: string; close?: string; active?: boolean }>;
  const [hours, setHours] = useState(DAYS.map((day, i) => ({
    day,
    open: raw[day]?.open || "09:00",
    close: raw[day]?.close || (i === 5 ? "16:00" : "22:00"),
    active: raw[day]?.active ?? i < 6,
  })));
  return (
    <>
      <Panel className="hours-overview">
        <span className="round-icon"><Clock3 size={28} /></span>
        <div>
          <h2>שעות הפעילות של העסק</h2>
          <p>הגדר מתי ניתן להזמין ולאסוף משלוחים</p>
        </div>
      </Panel>
      <Panel title="שעות פעילות">
        <DataTable
          headers={["יום", "פתיחה", "סגירה", "פעיל"]}
          rows={hours.map((h, i) => [
            h.day,
            <input key="o" type="time" disabled={!h.active} value={h.open} onChange={(e) => setHours(hours.map((x, j) => i === j ? { ...x, open: e.target.value } : x))} />,
            <input key="c" type="time" disabled={!h.active} value={h.close} onChange={(e) => setHours(hours.map((x, j) => i === j ? { ...x, close: e.target.value } : x))} />,
            <Toggle key="t" label={h.active ? "פעיל" : "סגור"} checked={h.active} onChange={(v) => setHours(hours.map((x, j) => i === j ? { ...x, active: v } : x))} />,
          ])}
        />
      </Panel>
      <SaveBar saving={saving} onSave={() => onSave(Object.fromEntries(hours.map((h) => [h.day, h])))} />
    </>
  );
}

function PickupSection({ me, niche, saving, onSaveProfile, onSaveNiche }: any) {
  const pickup = (niche.pickup || {}) as Record<string, string>;
  const [contact, setContact] = useState(me?.pickup_contact_name || "");
  const [phone, setPhone] = useState(me?.pickup_contact_phone || "");
  const [instructions, setInstructions] = useState(me?.pickup_instructions || "");
  const [prefs, setPrefs] = useState({ entrance: pickup.entrance || "כניסה ראשית", parking: pickup.parking || "המתנה בכניסה / דלפק", prep: pickup.prep || "15 דקות" });
  useEffect(() => {
    if (!me) return;
    setContact(me.pickup_contact_name || "");
    setPhone(me.pickup_contact_phone || "");
    setInstructions(me.pickup_instructions || "");
  }, [me]);
  return (
    <>
      <div className="three-cols pickup-grid">
        <Panel title="הוראות כניסה לאיסוף" icon={<DoorOpen size={19} />}>
          <Choices className="vertical" label="כניסה לאיסוף" value={prefs.entrance} onChange={(v) => setPrefs({ ...prefs, entrance: v })} options={["כניסה ראשית", "כניסה אחורית", "יש להתקשר בהגעה"]} />
        </Panel>
        <Panel title="איש קשר לאיסוף" icon={<User size={19} />}>
          <label className="field">שם<input value={contact} onChange={(e) => setContact(e.target.value)} /></label>
          <label className="field">טלפון<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </Panel>
        <Panel title="המתנת שליח" icon={<Car size={19} />}>
          <Choices className="vertical" label="המתנת שליח" value={prefs.parking} onChange={(v) => setPrefs({ ...prefs, parking: v })} options={["חניה ייעודית לעסק", "חניה ציבורית בקרבת מקום", "המתנה בכניסה / דלפק"]} />
        </Panel>
        <Panel title="הערות קבועות לאיסוף" icon={<MessageCircle size={19} />}>
          <label className="field">ההערה תוצג בכל משלוח<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={300} /></label>
        </Panel>
        <Panel title="זמן הכנה ממוצע" icon={<Clock3 size={19} />}>
          <SelectBox value={prefs.prep} onChange={(v) => setPrefs({ ...prefs, prep: v })} options={["מוכן עכשיו", "15 דקות", "30 דקות", "45 דקות"]} label="זמן הכנה" />
        </Panel>
        <Panel title="כתובת איסוף" icon={<Hash size={19} />}>
          <label className="field">כתובת<input value={me?.pickup_address || me?.address || ""} disabled /></label>
          <p className="hint">ניתן לעדכן כתובת בפרטי העסק או בסניפים.</p>
        </Panel>
      </div>
      <SaveBar
        saving={saving}
        onSave={() => {
          onSaveProfile({ pickup_contact_name: contact || null, pickup_contact_phone: phone || null, pickup_instructions: instructions || null });
          onSaveNiche({ pickup: prefs });
        }}
      />
    </>
  );
}

function CashSection({ niche, saving, onSave }: { niche: Niche; saving: boolean; onSave: (cash: any) => void }) {
  const cash = (niche.cash || {}) as { allow?: boolean; limit?: string; note?: string };
  const [f, setF] = useState({ allow: cash.allow ?? false, limit: cash.limit || "500", note: cash.note || "" });
  return (
    <Panel title="הגדרות מזומן" icon={<Wallet size={18} />}>
      <Toggle label="אפשר גביית מזומן" checked={f.allow} onChange={(v) => setF({ ...f, allow: v })} />
      <label className="field">סכום מרבי לגבייה (₪)<input type="number" min="0" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></label>
      <label className="field">הנחיה לשליח<textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
      <p className="hint">ההגדרה נשמרת בפרופיל העסק. גביית מזומן בפועל תלויה בפרטי כל משלוח.</p>
      <SaveBar saving={saving} onSave={() => onSave(f)} />
    </Panel>
  );
}

function DeliverySection({ niche, saving, onSave }: { niche: Niche; saving: boolean; onSave: (proof: any) => void }) {
  const proof = (niche.proof || {}) as Record<string, boolean | string>;
  const [f, setF] = useState({
    name: proof.name === true,
    photo: proof.photo === true,
    signature: proof.signature === true,
  });
  useEffect(() => {
    const next = (niche.proof || {}) as Record<string, boolean | string>;
    setF({
      name: next.name === true,
      photo: next.photo === true,
      signature: next.signature === true,
    });
  }, [niche.proof]);
  const extras = [
    { k: "name" as const, t: "שם המקבל", icon: User, d: "השליח ירשום את שם האדם שקיבל" },
    { k: "photo" as const, t: "תמונה", icon: Camera, d: "השליח יצלם את המשלוח בכתובת המסירה" },
    { k: "signature" as const, t: "חתימה", icon: Pencil, d: "השליח יפתח מסך לחתימת המקבל" },
  ];
  const extrasOn = f.name || f.photo || f.signature;
  const summary = extrasOn
    ? `נמסר תמיד, ונוסף: ${[f.name && "שם המקבל", f.photo && "תמונה", f.signature && "חתימה"].filter(Boolean).join(" · ")}`
    : "לחיצה על נמסר מספיקה. אפשר להוסיף שם, תמונה או חתימה.";
  return (
    <>
      <Panel title="הגדרת שיטות אישור מסירה">
        <p className="hint">לחיצה על נמסר תמיד נדרשת. אפשר להוסיף עוד שיטות — הן נפתחות אצל השליח בנוסף ללחיצה, לא במקומה.</p>
        <div className="delivery-methods">
          <div className="delivery-method on locked">
            <span className="round-icon"><ClipboardCheck size={18} /></span>
            <span className="delivery-method-copy">
              <strong>לחיצה על נמסר</strong>
              <p>ברירת המחדל — השליח תמיד מסמן שהמשלוח נמסר</p>
            </span>
            <span className="delivery-switch on" dir="ltr" aria-hidden><i /></span>
          </div>
          {extras.map((m) => {
            const on = !!f[m.k];
            return (
              <button
                key={m.k}
                type="button"
                className={on ? "delivery-method on" : "delivery-method"}
                aria-pressed={on}
                onClick={() => setF({ ...f, [m.k]: !on })}
              >
                <span className="round-icon"><m.icon size={18} /></span>
                <span className="delivery-method-copy">
                  <strong>{m.t}</strong>
                  <p>{m.d}</p>
                </span>
                <span className={on ? "delivery-switch on" : "delivery-switch"} dir="ltr" aria-hidden>
                  <i />
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint">{summary}</p>
      </Panel>
      <SaveBar
        saving={saving}
        onSave={() => onSave({
          name: f.name,
          photo: f.photo,
          signature: f.signature,
          done: true,
        })}
      />
    </>
  );
}

function NotesSection({ me, saving, onSave }: any) {
  const [notes, setNotes] = useState(me?.notes || me?.pickup_instructions || "");
  useEffect(() => { setNotes(me?.notes || me?.pickup_instructions || ""); }, [me]);
  return (
    <Panel title="הערות קבועות לשליחים">
      <label className="field">ההערה תוצג לשליח<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></label>
      <SaveBar saving={saving} onSave={() => onSave({ notes: notes || null, pickup_instructions: notes || null })} />
    </Panel>
  );
}

function DefaultsSection({ me, niche, saving, onSave }: any) {
  const d = (niche.defaults || {}) as Record<string, string | boolean>;
  const [f, setF] = useState({
    vehicle: String(d.vehicle || "אוטומטי"),
    payment: String(d.payment || "אשראי"),
    saveCustomers: d.saveCustomers !== false,
    notifications: d.notifications !== false,
    manualApproval: !!d.manualApproval,
  });
  return (
    <div className="defaults-layout">
      <Panel title="הגדרות ברירת מחדל">
        <label className="field">כתובת איסוף ברירת מחדל<input value={me?.pickup_address || me?.address || ""} readOnly /></label>
        <h3>אמצעי מסירה ברירת מחדל</h3>
        <Choices label="אמצעי מסירה" value={f.vehicle} onChange={(v) => setF({ ...f, vehicle: v })} options={["אוטומטי", "קטנוע", "רכב"]} />
        <h3>מקור תשלום ברירת מחדל</h3>
        <Choices label="מקור תשלום" value={f.payment} onChange={(v) => setF({ ...f, payment: v })} options={["אשראי", "יתרה"]} />
        <h2 className="subheading">התנהגות הזמנות נכנסות</h2>
        <Toggle label="התראות על הזמנות חדשות" checked={!!f.notifications} onChange={(v) => setF({ ...f, notifications: v })} />
        <Toggle label="הזמנות נכנסות דורשות אישור ידני" checked={!!f.manualApproval} onChange={(v) => setF({ ...f, manualApproval: v })} />
        <SaveBar saving={saving} onSave={() => onSave(f)} />
      </Panel>
      <Panel title="סיכום ברירות המחדל">
        <dl className="summary-dl">
          <dt>כתובת איסוף</dt>
          <dd>{me?.pickup_address || me?.address || "—"}</dd>
          <dt>אמצעי מסירה</dt>
          <dd>{f.vehicle}</dd>
          <dt>מקור תשלום</dt>
          <dd>{f.payment}</dd>
        </dl>
      </Panel>
    </div>
  );
}

function TeamSection() {
  const { data: me } = useMyBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const { data: members = [] } = useQuery({
    queryKey: ["team-members", me?.id],
    enabled: !!me?.id,
    queryFn: () => nestListTeamMembers() as Promise<any[]>,
  });
  const invite = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
        throw new Error("נא למלא שם, טלפון וסיסמה");
      }
      if (form.password.trim().length < 6) throw new Error("הסיסמה חייבת לפחות 6 תווים");
      return nestInviteTeamMember({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        password: form.password.trim(),
        role: "dispatcher",
      });
    },
    onSuccess: () => {
      toast.success("חבר צוות נוסף");
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setForm({ name: "", phone: "", password: "" });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => nestDeleteTeamMember(id),
    onSuccess: () => { toast.success("הוסר"); qc.invalidateQueries({ queryKey: ["team-members"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <div className="three-cols">
        <Panel className="center-card">
          <button type="button" className="round-icon" onClick={() => setOpen(true)} aria-label="הוסף איש צוות"><Plus size={25} /></button>
          <h3>הוסף איש צוות</h3>
          <p>הוסף עובד והגדר את תפקידו בעסק</p>
          <button type="button" className="btn outline" onClick={() => setOpen(true)}>הוסף איש צוות</button>
        </Panel>
        <Panel className="center-card team-manager-card">
          <span className="round-icon"><ShieldCheck size={25} /></span>
          <h3>{me?.business_name || me?.name || "מנהל העסק"}</h3>
          <Badge text="מנהל · גישה מלאה" tone="green" />
          <p>ניהול תפעול, כספים, הגדרות וצוות</p>
        </Panel>
        <Panel className="center-card">
          <Users size={30} />
          <strong className="big-stat">{members.length}</strong>
          <h3>אנשי צוות תפעול</h3>
        </Panel>
      </div>
      <Panel title="צוות העסק">
        <DataTable
          className="team-desktop"
          headers={["שם מלא", "הרשאה", "טלפון", "סטטוס", "פעולות"]}
          rows={members.map((t) => [
            t.name,
            "תפעול משלוחים בלבד",
            t.phone,
            t.accepted_at ? "פעיל" : "ממתין",
            <div key="a" className="icon-actions">
              <button type="button" aria-label="מחיקה" onClick={() => remove.mutate(t.id)}><Trash2 /></button>
            </div>,
          ])}
        />
        <div className="team-mobile">
          {members.map((t) => (
            <article key={t.id} className="team-member">
              <div>
                <span className="round-icon"><User size={21} /></span>
                <div>
                  <h3>{t.name}</h3>
                  <Badge text="תפעול משלוחים בלבד" tone="green" />
                </div>
              </div>
              <p><Phone size={15} /><bdi>{t.phone}</bdi></p>
              <footer>
                <button type="button" className="icon-btn red-text" onClick={() => remove.mutate(t.id)}><Trash2 size={16} /></button>
              </footer>
            </article>
          ))}
        </div>
      </Panel>
      <Modal
        open={open}
        onClose={() => { setOpen(false); setForm({ name: "", phone: "", password: "" }); }}
        title="הוספת איש צוות"
        description="איש הצוות יקבל הרשאת תפעול משלוחים בלבד"
        className="team-invite-dialog"
      >
        <form className="team-invite-form" onSubmit={(e) => { e.preventDefault(); invite.mutate(); }}>
          <div className="team-invite-fields">
            <label className="field">שם מלא<input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="שם איש הצוות" /></label>
            <label className="field">מספר טלפון<input required type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-000-0000" /></label>
            <label className="field team-invite-password">סיסמה לכניסה<input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="לפחות 6 תווים" /></label>
          </div>
          <div className="team-permission-card">
            <div className="team-permission-head">
              <span className="team-invite-icon" aria-hidden><ShieldCheck size={20} /></span>
              <span>
                <strong>הרשאת תפעול משלוחים</strong>
                <small>גישה מוגבלת לעבודה השוטפת בלבד</small>
              </span>
            </div>
            <ul>
              {["יצירת הזמנה חדשה", "אישור ומעקב משלוחים", "צ׳אט עם שליחים", "צ׳אט עם התמיכה"].map((item) => (
                <li key={item}><CheckCircle2 size={15} />{item}</li>
              ))}
            </ul>
            <p>ללא גישה לכספים, חשבוניות, הגדרות העסק או ניהול צוות.</p>
          </div>
          <div className="team-invite-actions">
            <button type="submit" className="btn primary" disabled={invite.isPending}>
              <UserPlus size={16} />
              {invite.isPending ? "מוסיף…" : "הוספת איש צוות"}
            </button>
            <button type="button" className="btn outline" onClick={() => setOpen(false)}>ביטול</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ZonesSection({ niche, saving, onSave }: { niche: Niche; saving: boolean; onSave: (zones: any[]) => void }) {
  const { data: me } = useMyBusiness();
  const cities = ((me as { delivery_cities?: string[] } | null)?.delivery_cities || []) as string[];
  const zones = (Array.isArray(niche.service_zones) ? niche.service_zones : []) as Array<{ id: string; name: string; radius: string; active: boolean }>;
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ id?: string; name: string; radius: string } | null>(null);
  const commit = () => {
    if (!editor?.name) return;
    const next = editor.id
      ? zones.map((z) => (z.id === editor.id ? { ...z, name: editor.name, radius: editor.radius } : z))
      : [...zones, { id: crypto.randomUUID(), name: editor.name, radius: editor.radius || "3", active: true }];
    onSave(next);
    setEditor(null);
  };
  return (
    <>
      <div className="section-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="חיפוש אזור שירות..." />
        <button type="button" className="btn primary" onClick={() => setEditor({ name: "", radius: "3" })}><Plus size={16} />הוסף אזור שירות</button>
      </div>
      <div className="zones-layout">
        <div>
          {zones.filter((z) => z.name.includes(query)).map((z) => (
            <Panel key={z.id}>
              <Toggle label={z.name} checked={z.active} onChange={(v) => onSave(zones.map((x) => x.id === z.id ? { ...x, active: v } : x))} />
              <p className="hint">רדיוס משוער: {z.radius} ק״מ</p>
              <button type="button" className="btn outline small" onClick={() => setEditor({ id: z.id, name: z.name, radius: z.radius })}><Pencil size={13} />ערוך</button>
            </Panel>
          ))}
          {cities.length > 0 && <p className="hint">ערי משלוח שמורות בפרופיל: {cities.join(", ")}</p>}
        </div>
        <Panel>
          <LiveJobsMap pins={[]} className="min-h-[16rem]" />
          <p className="hint">גבולות אזור על המפה עדיין אינם מחוברים לשרת. הרשימה נשמרת בפרופיל העסק.</p>
        </Panel>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(zones)} />
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "עריכת אזור שירות" : "אזור שירות חדש"} description="הגדירו אזור לפי שם ורדיוס בקילומטרים">
        {editor && (
          <form onSubmit={(e) => { e.preventDefault(); commit(); }}>
            <label className="field">שם האזור<input required autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="למשל מרכז העיר" /></label>
            <label className="field">רדיוס (ק״מ)<input type="number" min="0" step="0.1" value={editor.radius} onChange={(e) => setEditor({ ...editor, radius: e.target.value })} /></label>
            <SaveBar onCancel={() => setEditor(null)} />
          </form>
        )}
      </Modal>
    </>
  );
}

function StatusSection({ me, niche, saving, onSaveNiche, onSaveProfile }: any) {
  const st = (niche.status || {}) as { pause?: boolean; message?: string };
  const [pause, setPause] = useState(!!st.pause);
  const [message, setMessage] = useState(st.message || "אנחנו סגורים כרגע.");
  return (
    <Panel className="status-panel" title="מצב העסק">
      <Toggle checked={!pause} onChange={(v) => setPause(!v)} label="העסק פעיל" description="הצג את העסק כזמין לקבלת משלוחים" />
      <Toggle checked={pause} onChange={setPause} label="השהיית הזמנות חדשות" />
      <label className="field">הודעה בזמן שהעסק סגור<input value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <p className="hint">ההשהיה נשמרת בפרופיל. שידור משלוח בפועל עדיין מתבצע ממסך ההזמנה לפי הכללים הקיימים בשרת.</p>
      <SaveBar
        saving={saving}
        onSave={() => {
          onSaveNiche({ status: { pause, message } });
          onSaveProfile({ notes: pause ? message : me?.notes });
        }}
      />
    </Panel>
  );
}
