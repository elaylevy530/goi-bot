import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CourierStatusBadge } from "@/components/StatusBadges";
import { nestCreateCourier, nestListCouriers, nestUpdateCourier } from "@/lib/nest-accounts";
import { nestProvisionCourier } from "@/lib/nest-auth";
import { useServerFn } from "@tanstack/react-start";
import { reclassifyCourier, deleteCourier, approveCourier } from "@/lib/courier-intake.functions";
import { sendApprovalPendingBroadcast } from "@/lib/admin-broadcast.functions";
import { pushNotifyCouriers } from "@/lib/push-notify.functions";
import { partnersUrl } from "@/lib/partners-redirect";

import {
  COURIER_STATUSES, VEHICLE_TYPES, JOB_TYPES, AVAILABILITY, INVOICE_STATUS,
  type CourierStatus,
} from "@/lib/constants";
import { REGIONS, regionOf, regionsOfCourier, type Region } from "@/lib/regions";
import {
  MoreHorizontal, Plus, Eye, CheckCircle2, AlertCircle, MessageCircle, Ban, Loader2, Pause,
  Pencil, StickyNote, Link2, ExternalLink, Trash2, Filter, Bell,
  Users, MapPin, Bike, TrendingUp, Building2, Target, Compass,
} from "lucide-react";

/** DB historically used "individual"; join form / UI use "courier". Treat both as שליח. */
function normalizeCourierKind(kind: string | null | undefined): "courier" | "mover" {
  return kind === "mover" ? "mover" : "courier";
}

// Public registration URL — always use the published domain so couriers
// don't hit the Lovable preview auth wall when opened from the editor.
const PUBLIC_JOIN_URL = partnersUrl("/join");

function PendingBroadcastButton() {
  const fn = useServerFn(sendApprovalPendingBroadcast);
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (!confirm("לשלוח הודעת 'מאושר אך מושהה' לכל השליחים שאושרו אוטומטית?")) return;
    setBusy(true);
    try {
      const r: any = await fn({ data: undefined as any });
      toast.success(`נשלחו ${r?.sent ?? 0} מתוך ${r?.total ?? 0}${r?.failed ? ` (נכשלו ${r.failed})` : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בשליחה");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
      שלח "מאושר ומושהה" לכולם
    </Button>
  );
}

function CopyJoinLink() {

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_JOIN_URL);
      setCopied(true);
      toast.success("הלינק הועתק! אפשר לשלוח לשליחים בוואטסאפ");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("לא הצלחתי להעתיק");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
        {copied ? <CheckCircle2 className="size-4 text-primary" /> : <Link2 className="size-4" />}
        <span className="hidden sm:inline">{copied ? "הועתק" : "העתק לינק הרשמה"}</span>
        <span className="sm:hidden">לינק</span>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <a href={PUBLIC_JOIN_URL} target="_blank" rel="noreferrer" title="פתח טופס הרשמה">
          <ExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  );
}

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/couriers-admin")({
  head: () => ({ meta: [{ title: "שליחים — Goi" }] }),
  component: CouriersPage,
});

const LEAD_SOURCES = ["טופס /join", "ידני", "וואטסאפ", "פייסבוק", "המלצה", "אחר"] as const;

type CourierRow = {
  id: string;
  full_name: string;
  whatsapp_phone: string;
  base_city: string | null;
  gender: string | null;
  working_areas: string[] | null;
  vehicle_type: string | null;
  job_types: string[] | null;
  availability: string[] | null;
  invoice_status: string | null;
  experience: string | null;
  courier_status: CourierStatus;
  courier_kind: "courier" | "mover" | null;
  notes: string | null;
  lead_source: string | null;
  created_at: string;
  courier_tags: { tag: { id: string; name: string; color: string | null } | null }[];
};


async function fetchCouriers(): Promise<CourierRow[]> {
  const data = await nestListCouriers({ limit: 500 });
  // Nest listCouriers does not include courier_tags (legacy Supabase join).
  return (data ?? []).map((raw) => {
    const c = raw as unknown as CourierRow;
    return { ...c, courier_tags: c.courier_tags ?? [] };
  });
}

function NewCourierDialog() {
  const qc = useQueryClient();
  const reclassify = useServerFn(reclassifyCourier);
  const [open, setOpen] = useState(false);
  const empty = {
    full_name: "", whatsapp_phone: "", base_city: "", gender: "",
    vehicle_type: "קטנוע", invoice_status: "לא", experience: "",
    courier_status: "נרשם" as CourierStatus, lead_source: "ידני", notes: "",
  };
  const [form, setForm] = useState(empty);

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.whatsapp_phone.trim()) {
        throw new Error("שם ומספר וואטסאפ הם שדות חובה");
      }
      const created = await nestCreateCourier({
        full_name: form.full_name.trim(),
        whatsapp_phone: form.whatsapp_phone.trim(),
        base_city: form.base_city || null,
        gender: form.gender || null,
        vehicle_type: form.vehicle_type || null,
        invoice_status: form.invoice_status || null,
        courier_experience_duration: form.experience?.trim().slice(0, 60) || null,
        courier_status: form.courier_status,
        lead_source: form.lead_source || "ידני",
        notes: form.notes || null,
      });
      // Best-effort login provisioning (temp password) — row create already succeeded
      try {
        await nestProvisionCourier(created.id);
      } catch (e) {
        console.warn("provision after create failed", e);
      }
      try {
        await reclassify({ data: { id: created.id } });
      } catch {
        // tagging is best-effort
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("שליח נוסף");
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> הוסף שליח ידנית</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>הוספת שליח ידנית</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>שם מלא *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>וואטסאפ *</Label><Input value={form.whatsapp_phone} onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })} placeholder="050-1234567" /></div>
          <div><Label>עיר בסיס</Label><Input value={form.base_city} onChange={(e) => setForm({ ...form, base_city: e.target.value })} /></div>
          <div>
            <Label>מין</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="זכר">זכר</SelectItem>
                <SelectItem value="נקבה">נקבה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>רכב</Label>
            <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>חשבונית</Label>
            <Select value={form.invoice_status} onValueChange={(v) => setForm({ ...form, invoice_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INVOICE_STATUS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>ניסיון</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="לדוגמה: שנתיים" /></div>
          <div>
            <Label>סטטוס</Label>
            <Select value={form.courier_status} onValueChange={(v) => setForm({ ...form, courier_status: v as CourierStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COURIER_STATUSES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>מקור ליד</Label>
            <Select value={form.lead_source} onValueChange={(v) => setForm({ ...form, lead_source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>הערות</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.full_name || !form.whatsapp_phone || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ courier, open, onOpenChange }: { courier: CourierRow | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      if (!courier) return;
      const stamp = new Date().toLocaleString("he-IL");
      const merged = courier.notes ? `${courier.notes}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`;
      await nestUpdateCourier(courier.id, { notes: merged });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      toast.success("הערה נוספה");
      setNote("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>הוסף הערה — {courier?.full_name}</DialogTitle></DialogHeader>
        {courier?.notes && (
          <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {courier.notes}
          </div>
        )}
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה חדשה..." rows={4} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={!note.trim() || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} שמור הערה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function openWhatsApp(phone: string) {
  const p = phone.replace(/\D/g, "").replace(/^0/, "972");
  window.open(`https://wa.me/${p}`, "_blank");
}

function CouriersPage() {
  const qc = useQueryClient();
  const { data: allCouriers = [], isLoading } = useQuery({ queryKey: ["couriers"], queryFn: fetchCouriers });
  const [fKind, setFKind] = useState<"courier" | "mover">("courier");
  const couriers = useMemo(
    () => allCouriers.filter((c) => normalizeCourierKind(c.courier_kind) === fKind),
    [allCouriers, fKind],
  );
  const kindCounts = useMemo(() => {
    let couriersN = 0, moversN = 0;
    allCouriers.forEach((c) => {
      if (normalizeCourierKind(c.courier_kind) === "mover") moversN++;
      else couriersN++;
    });
    return { couriers: couriersN, movers: moversN };
  }, [allCouriers]);


  useEffect(() => {
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [qc]);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fAreas, setFAreas] = useState<string[]>([]);
  const [fRegions, setFRegions] = useState<Region[]>([]);
  const [fVehicle, setFVehicle] = useState("all");
  const [fJobTypes, setFJobTypes] = useState<string[]>([]);
  const [fAvailability, setFAvailability] = useState("all");
  const [fInvoice, setFInvoice] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [fIncomplete, setFIncomplete] = useState<"all" | "no_areas" | "no_city">("all");
  const [noteCourier, setNoteCourier] = useState<CourierRow | null>(null);

  const approveFn = useServerFn(approveCourier);
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CourierStatus }) => {
      if (status === "פעיל") {
        const res = await approveFn({ data: { id, suspended: false } });
        return res;
      }
      if (status === "מושהה") {
        const res = await approveFn({ data: { id, suspended: true } });
        return { ...res, suspended: true };
      }
      await nestUpdateCourier(id, { courier_status: status });
      return { ok: true, whatsappSent: false };
    },
    onSuccess: (res: { whatsappSent?: boolean; suspended?: boolean } | void) => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (res && "whatsappSent" in res) {
        const suspendedNote = res.suspended ? " (במצב מושהה — לא יקבל עבודות עד הפעלה ידנית)" : "";
        toast.success("אושר בהצלחה ✅" + suspendedNote);
      } else {
        toast.success("סטטוס עודכן");
      }
    },
    onError: (e: Error) => toast.error(e.message || "שגיאה בעדכון סטטוס"),
  });

  const del = useServerFn(deleteCourier);
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("השליח נמחק מהמערכת");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDelete = (c: CourierRow) => {
    if (window.confirm(`למחוק את ${c.full_name} מהמערכת? פעולה זו לא ניתנת לביטול.`)) {
      deleteMut.mutate(c.id);
    }
  };

  const allAreas = useMemo(() => {
    const s = new Set<string>();
    couriers.forEach((c) => (c.working_areas ?? []).forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [couriers]);

  const stats = useMemo(() => {
    const cityMap = new Map<string, number>();
    const areaMap = new Map<string, number>();
    const regionMap = new Map<Region, number>();
    const vehicleMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const jobTypeMap = new Map<string, number>();
    let active = 0, pending = 0, withCity = 0, withAreas = 0;
    const today = new Date().toISOString().slice(0, 10);
    let newToday = 0;

    couriers.forEach((c) => {
      const city = (c.base_city ?? "").trim();
      if (city) { cityMap.set(city, (cityMap.get(city) ?? 0) + 1); withCity++; }
      (c.working_areas ?? []).forEach((a) => {
        const k = a.trim(); if (!k) return;
        areaMap.set(k, (areaMap.get(k) ?? 0) + 1);
      });
      if ((c.working_areas ?? []).length) withAreas++;
      const v = c.vehicle_type ?? "לא ידוע";
      vehicleMap.set(v, (vehicleMap.get(v) ?? 0) + 1);
      statusMap.set(c.courier_status, (statusMap.get(c.courier_status) ?? 0) + 1);
      (c.job_types ?? []).forEach((jt) => {
        const k = jt.trim(); if (!k) return;
        jobTypeMap.set(k, (jobTypeMap.get(k) ?? 0) + 1);
      });
      regionsOfCourier(c as any).forEach((r) => regionMap.set(r, (regionMap.get(r) ?? 0) + 1));
      if (c.courier_status === "פעיל") active++;
      if (c.courier_status === "ממתין לאישור") pending++;
      if (c.created_at?.slice(0, 10) === today) newToday++;
    });

    const sortDesc = <K,>(m: Map<K, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

    return {
      total: couriers.length,
      active, pending, newToday,
      noCity: couriers.length - withCity,
      noAreas: couriers.length - withAreas,
      cities: sortDesc(cityMap),
      areas: sortDesc(areaMap),
      regions: sortDesc(regionMap),
      vehicles: sortDesc(vehicleMap),
      statuses: sortDesc(statusMap),
      jobTypes: sortDesc(jobTypeMap),
    };
  }, [couriers]);

  const filtered = couriers.filter((c) => {
    if (fStatus !== "all" && c.courier_status !== fStatus) return false;
    if (fAreas.length > 0 && !fAreas.some((a) => (c.working_areas ?? []).includes(a))) return false;
    if (fRegions.length > 0) {
      const courierRegions = regionsOfCourier(c as any);
      if (!fRegions.some((r) => courierRegions.includes(r))) return false;
    }
    if (fVehicle !== "all" && c.vehicle_type !== fVehicle) return false;
    if (fJobTypes.length > 0 && !fJobTypes.some((jt) => (c.job_types ?? []).includes(jt))) return false;
    if (fAvailability !== "all" && !(c.availability ?? []).includes(fAvailability)) return false;
    if (fInvoice !== "all" && c.invoice_status !== fInvoice) return false;
    if (fSource !== "all" && (c.lead_source ?? "") !== fSource) return false;
    if (fIncomplete === "no_areas" && (c.working_areas ?? []).length > 0) return false;
    if (fIncomplete === "no_city" && (c.base_city ?? "").trim() !== "") return false;
    if (q && !`${c.full_name} ${c.whatsapp_phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const resetFilters = () => {
    setFStatus("all"); setFAreas([]); setFRegions([]); setFVehicle("all"); setFJobTypes([]);
    setFAvailability("all"); setFInvoice("all"); setFSource("all"); setFIncomplete("all"); setQ("");
  };

  const toggleInArray = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const kindLabel = fKind === "mover" ? "מובילים" : "שליחים";
  const kindOne = fKind === "mover" ? "המוביל" : "השליח";
  const kindJobs = fKind === "mover" ? "הובלות" : "משלוחים";
  return (
    <AdminLayout title={kindLabel} subtitle={`${couriers.length} ${kindLabel} במערכת`} actions={<div className="flex items-center gap-2"><PendingBroadcastButton /><CopyJoinLink /><NewCourierDialog /></div>}>
      {/* === Kind tabs (שליחים / מובילים) === */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFKind("courier")}
          className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            fKind === "courier"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background hover:bg-muted border-border"
          }`}
        >
          <Bike className="size-4" />
          שליחים
          <span className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold ${
            fKind === "courier" ? "bg-primary-foreground/20" : "bg-muted"
          }`}>{kindCounts.couriers}</span>
        </button>
        <button
          onClick={() => setFKind("mover")}
          className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            fKind === "mover"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background hover:bg-muted border-border"
          }`}
        >
          <Users className="size-4" />
          מובילים
          <span className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[11px] font-bold ${
            fKind === "mover" ? "bg-primary-foreground/20" : "bg-muted"
          }`}>{kindCounts.movers}</span>
        </button>
      </div>

      {/* === Hero analytics === */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-bl from-primary/10 via-background to-sky-500/5 p-4 lg:p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base lg:text-lg font-bold flex items-center gap-2">
              <Target className="size-4 text-primary" /> מפת ה{kindLabel} שלי
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">נתונים מלאים: היכן יש לי כיסוי לגייס עסקים</p>
          </div>
          {(stats.noAreas > 0 || stats.noCity > 0) && (
            <button
              onClick={() => setFIncomplete(stats.noAreas >= stats.noCity ? "no_areas" : "no_city")}
              className="text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1.5 transition-colors"
              title={`הצג ${kindLabel} עם פרטים חסרים`}
            >
              <AlertCircle className="size-3.5" />
              {stats.noAreas + stats.noCity} עם פרטים חסרים
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <KpiCard label={`סה״כ ${kindLabel}`} value={stats.total} icon={Users} tone="primary" />
          <KpiCard label="פעילים" value={stats.active} icon={CheckCircle2} tone="success" />
          <KpiCard label="ממתינים לאישור" value={stats.pending} icon={AlertCircle} tone="warning" />
          <KpiCard label="נרשמו היום" value={stats.newToday} icon={TrendingUp} tone="info" />
          <KpiCard label="ערים פעילות" value={stats.cities.length} icon={Building2} tone="neutral" sub={`${stats.areas.length} אזורי פעילות`} />
        </div>
      </div>

      {/* === אזורים גיאוגרפיים — מבט מאקרו === */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="size-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">חלוקה לפי איזור גיאוגרפי</div>
              <div className="text-[11px] text-muted-foreground">לחץ על איזור כדי לסנן את הטבלה. {kindOne} נספר בכל איזור שהוא גר בו או מוכן לעבוד בו.</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {REGIONS.map((r) => {
              const count = stats.regions.find(([n]) => n === r)?.[1] ?? 0;
              const active = fRegions.includes(r);
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <button
                  key={r}
                  onClick={() => setFRegions((prev) => toggleInArray(prev, r))}
                  className={`group text-right p-3 rounded-xl border transition-all ${
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold truncate">{r}</div>
                    {active && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
                  </div>
                  <div className="text-2xl font-bold tabular-nums mt-1">{count}</div>
                  <div className="text-[10px] text-muted-foreground">{pct}% מה{kindLabel}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <BreakdownCard
          title={`עיר בסיס (היכן ${kindOne} גר)`}
          subtitle={`לפי המידע שמילאו ה${kindLabel} בהרשמה`}
          icon={Building2}
          items={stats.cities}
          total={stats.total}
          emptyMsg={`אין ${kindLabel} עם עיר בסיס`}
          missingCount={stats.noCity}
          missingLabel="ללא עיר בסיס — לחץ להצגה"
          onMissingClick={() => setFIncomplete("no_city")}
          onItemClick={() => {}}
          accent="bg-primary"
        />
        <BreakdownCard
          title="אזורי עבודה (היכן מוכן לעבוד)"
          subtitle={`ערים בהן ${kindOne} מוכן לקבל ${kindJobs}`}
          icon={MapPin}
          items={stats.areas}
          total={stats.total}
          emptyMsg={`אין ${kindLabel} עם אזורי פעילות`}
          missingCount={stats.noAreas}
          missingLabel="ללא אזורי עבודה — לחץ להצגה"
          onMissingClick={() => setFIncomplete("no_areas")}
          onItemClick={(name) => setFAreas((prev) => prev.includes(name) ? prev : [...prev, name])}
          accent="bg-info"
        />
        <BreakdownCard
          title={`סוגי ${kindJobs} שמוכנים לבצע`}
          subtitle={`מה שה${kindLabel} סימנו בהרשמה`}
          icon={Bike}
          items={stats.jobTypes}
          total={stats.total}
          emptyMsg={`אין נתונים על סוגי ${kindJobs}`}
          onItemClick={(name) => setFJobTypes((prev) => prev.includes(name) ? prev : [...prev, name])}
          accent="bg-primary"
        />
      </div>



      {/* פילוח סטטוסים — שורה אופקית של צ׳יפים לקליק מהיר */}
      <Card className="mb-4">
        <CardContent className="p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">פילוח לפי סטטוס</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.statuses.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setFStatus(name)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  fStatus === name ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted"
                }`}
              >
                <span>{name}</span>
                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  fStatus === name ? "bg-primary-foreground/20" : "bg-background border"
                }`}>{count}</span>
              </button>
            ))}
            {stats.statuses.length === 0 && <span className="text-xs text-muted-foreground">אין נתונים</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 lg:p-4 space-y-3 border-b">
          <div className="flex gap-2 flex-wrap items-center">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או טלפון..." className="flex-1 min-w-[200px] lg:max-w-sm" />
            {fIncomplete !== "all" && (
              <Badge variant="outline" className="gap-1.5 bg-amber-50 border-amber-300 text-amber-800 py-1">
                <AlertCircle className="size-3" />
                {fIncomplete === "no_areas" ? "מציג: ללא אזורי עבודה" : "מציג: ללא עיר בסיס"}
                <button onClick={() => setFIncomplete("all")} className="mr-1 hover:text-amber-950" title="הסר">✕</button>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={resetFilters}>אפס פילטרים</Button>
            <div className="text-xs lg:text-sm text-muted-foreground self-center mr-auto">{filtered.length} מתוך {couriers.length}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="סטטוס" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {COURIER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <MultiSelectFilter
              label="אזורי עבודה"
              placeholder="אזורי עבודה"
              options={allAreas}
              selected={fAreas}
              onChange={setFAreas}
            />
            <Select value={fVehicle} onValueChange={setFVehicle}>
              <SelectTrigger><SelectValue placeholder="כלי" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הכלים</SelectItem>
                {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <MultiSelectFilter
              label="סוגי משלוחים"
              placeholder="סוגי משלוחים"
              options={[...JOB_TYPES]}
              selected={fJobTypes}
              onChange={setFJobTypes}
            />
            <MultiSelectFilter
              label="איזור גיאוגרפי"
              placeholder="איזור (מרכז/צפון…)"
              options={[...REGIONS]}
              selected={fRegions}
              onChange={(v: string[]) => setFRegions(v as Region[])}
            />
            <Select value={fAvailability} onValueChange={setFAvailability}>
              <SelectTrigger><SelectValue placeholder="זמינות" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הזמינויות</SelectItem>
                {AVAILABILITY.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fInvoice} onValueChange={setFInvoice}>
              <SelectTrigger><SelectValue placeholder="חשבונית" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המצבים</SelectItem>
                {INVOICE_STATUS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSource} onValueChange={setFSource}>
              <SelectTrigger><SelectValue placeholder="מקור ליד" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                {LEAD_SOURCES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        {/* Mobile: card list */}
        <div className="lg:hidden divide-y">
          {isLoading && <div className="py-8 text-center text-muted-foreground text-sm">טוען...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm px-4">לא נמצאו {kindLabel} עם הסינון הנוכחי.</div>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="p-3 flex flex-col gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
                <Link to="/couriers/$id" params={{ id: c.id }} className="min-w-0">
                  <div className="font-semibold truncate">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{c.whatsapp_phone}</div>
                </Link>
                <CourierStatusBadge status={c.courier_status} />
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {c.base_city && <Badge variant="outline">{c.base_city}</Badge>}
                {c.gender && <Badge variant="outline">{c.gender}</Badge>}
                {c.vehicle_type && <Badge variant="outline">{c.vehicle_type}</Badge>}
                {c.invoice_status && <Badge variant="outline">חשבונית: {c.invoice_status}</Badge>}
                {c.lead_source && <Badge variant="outline">{c.lead_source}</Badge>}
                {c.courier_tags.slice(0, 4).map((ct) => ct.tag && (
                  <Badge key={ct.tag.id} variant="secondary">{ct.tag.name}</Badge>
                ))}
              </div>
              <CourierActions c={c} onNote={setNoteCourier} onDelete={onDelete} updateStatus={(s) => updateStatus.mutate({ id: c.id, status: s })} mobile />
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם מלא</TableHead>
                <TableHead>טלפון וואטסאפ</TableHead>
                <TableHead>עיר בסיס</TableHead>
                <TableHead>מין</TableHead>
                <TableHead>אזורי עבודה</TableHead>
                <TableHead>אזורי איסוף</TableHead>
                <TableHead>אזורי מסירה</TableHead>
                <TableHead>מרחק עבודה</TableHead>
                <TableHead>כלי עבודה</TableHead>
                <TableHead>סוגי עבודות</TableHead>
                <TableHead>זמינות</TableHead>
                <TableHead>חשבונית</TableHead>
                <TableHead>ניסיון</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תגיות</TableHead>
                <TableHead>מקור ליד</TableHead>
                <TableHead>תאריך הרשמה</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={18} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={18} className="text-center py-8 text-muted-foreground">
                  לא נמצאו {kindLabel}. לחץ "הוסף שליח ידנית" כדי להתחיל.
                </TableCell></TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold whitespace-nowrap">
                    <Link to="/couriers/$id" params={{ id: c.id }} className="hover:text-primary">{c.full_name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm whitespace-nowrap">{c.whatsapp_phone}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.base_city ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.gender ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={(c.working_areas ?? []).join(", ")}>
                    {(c.working_areas ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={((c as any).pickup_areas ?? []).join(", ")}>
                    {((c as any).pickup_areas ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={((c as any).dropoff_areas ?? []).join(", ")}>
                    {((c as any).dropoff_areas ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{(c as any).work_distance_from_base ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={((c as any).vehicle_types ?? []).join(", ")}>
                    {((c as any).vehicle_types ?? []).join(", ") || c.vehicle_type || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={(c.job_types ?? []).join(", ")}>
                    {(c.job_types ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate" title={(c.availability ?? []).join(", ")}>
                    {(c.availability ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{c.invoice_status ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{(c as any).courier_experience_status ?? c.experience ?? "—"}</TableCell>
                  <TableCell><CourierStatusBadge status={c.courier_status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {c.courier_tags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {c.courier_tags.slice(0, 3).map((ct) => ct.tag && (
                        <Badge key={ct.tag.id} variant="secondary" className="text-[10px]">{ct.tag.name}</Badge>
                      ))}
                      {c.courier_tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{c.courier_tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{c.lead_source ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell className="text-end">
                    <CourierActions c={c} onNote={setNoteCourier} onDelete={onDelete} updateStatus={(s) => updateStatus.mutate({ id: c.id, status: s })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <NoteDialog courier={noteCourier} open={!!noteCourier} onOpenChange={(v) => !v && setNoteCourier(null)} />
    </AdminLayout>
  );
}

function CourierActions({
  c, onNote, onDelete, updateStatus, mobile,
}: {
  c: CourierRow;
  onNote: (c: CourierRow) => void;
  onDelete: (c: CourierRow) => void;
  updateStatus: (s: CourierStatus) => void;
  mobile?: boolean;
}) {
  const notifyFn = useServerFn(pushNotifyCouriers);
  const [pushBusy, setPushBusy] = useState(false);
  const sendTestPush = async () => {
    setPushBusy(true);
    try {
      const r: any = await notifyFn({ data: {
        courierIds: [c.id],
        title: "🚚 Goi — בדיקת התראה",
        body: "📍 תל אביב → רמת גן\n₪45 · 6.2 ק\"מ",
        url:
          typeof window !== "undefined"
            ? `${window.location.origin}/courier/new-jobs`
            : "/courier/new-jobs",
        tag: `goi-test-${c.id}`,
      } });
      if ((r?.sent ?? 0) > 0) {
        toast.success(`נשלחה התראת בדיקה ל-${c.full_name} (${r.sent} מכשירים)`);
      } else if ((r?.expired ?? 0) > 0) {
        toast.error("המנוי הישן פג — השליח צריך לפתוח את האפליקציה פעם אחת כדי להירשם מחדש");
      } else {
        toast.error("לשליח אין מנוי Push פעיל. שיפתח את אפליקציית השליח פעם אחת כדי להירשם.");
      }
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בשליחת ההתראה");
    } finally {
      setPushBusy(false);
    }
  };
  return (
    <div className={mobile ? "flex gap-2 pt-1" : ""}>
      {mobile && (
        <>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/couriers/$id" params={{ id: c.id }}><Eye className="size-4" /> צפייה</Link>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => openWhatsApp(c.whatsapp_phone)}>
            <MessageCircle className="size-4" /> וואטסאפ
          </Button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={mobile ? "outline" : "ghost"} size="icon"><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link to="/couriers/$id" params={{ id: c.id }}><Eye className="size-4" /> צפייה</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/couriers/$id" params={{ id: c.id }}><Pencil className="size-4" /> עריכה</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => updateStatus("פעיל")}>
            <CheckCircle2 className="size-4 text-primary" /> אשר כפעיל
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateStatus("מושהה")}>
            <Pause className="size-4 text-amber-600" /> אשר כמושהה
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateStatus("חסר פרטים")}>
            <AlertCircle className="size-4" /> סמן חסר פרטים
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openWhatsApp(c.whatsapp_phone)}>
            <MessageCircle className="size-4" /> שלח וואטסאפ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNote(c)}>
            <StickyNote className="size-4" /> הוסף הערה
          </DropdownMenuItem>
          <DropdownMenuItem onClick={sendTestPush} disabled={pushBusy}>
            {pushBusy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4 text-blue-600" />}
            שלח התראת בדיקה
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => updateStatus("חסום")} className="text-destructive focus:text-destructive">
            <Ban className="size-4" /> חסום
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(c)} className="text-destructive focus:text-destructive">
            <Trash2 className="size-4" /> מחק שליח
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type IconType = typeof Users;

function KpiCard({
  label, value, icon: Icon, tone, sub,
}: {
  label: string;
  value: number;
  icon: IconType;
  tone: "primary" | "success" | "warning" | "info" | "neutral";
  sub?: string;
}) {
  const toneCls =
    tone === "primary" ? "bg-primary/10 text-primary"
    : tone === "success" ? "bg-success-bg text-success-text"
    : tone === "warning" ? "bg-warning-bg text-warning-text"
    : tone === "info" ? "bg-info-bg text-info-text"
    : "bg-muted text-text-muted";
  return (
    <Card className="overflow-hidden rounded-card shadow-card border-border/60 bg-surface">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="text-xs text-text-muted">{label}</div>
          <div className="text-2xl lg:text-3xl font-bold mt-1 tabular-nums text-text-strong">{value}</div>
          {sub && <div className="text-[11px] text-text-muted mt-1 truncate">{sub}</div>}
        </div>
        <div className={`size-10 rounded-lg grid place-items-center shrink-0 ${toneCls}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title, subtitle, icon: Icon, items, total, emptyMsg,
  missingCount, missingLabel, onMissingClick, onItemClick, accent,
}: {
  title: string;
  subtitle?: string;
  icon: IconType;
  items: [string, number][];
  total: number;
  emptyMsg: string;
  missingCount?: number;
  missingLabel?: string;
  onMissingClick?: () => void;
  onItemClick: (name: string) => void;
  accent: string;
}) {
  const top = items.slice(0, 8);
  const max = top[0]?.[1] ?? 1;
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-9 rounded-lg bg-gradient-to-br from-muted to-muted/50 grid place-items-center shrink-0">
              <Icon className="size-4 text-foreground/70" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{title}</div>
              {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0 tabular-nums">{items.length}</Badge>
        </div>

        <div className="mt-3 space-y-2">
          {top.length === 0 && (
            <div className="text-xs text-muted-foreground py-6 text-center">{emptyMsg || "אין נתונים"}</div>
          )}
          {top.map(([name, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const w = Math.max(4, Math.round((count / max) * 100));
            return (
              <button
                key={name}
                onClick={() => onItemClick(name)}
                className="w-full text-right group"
                title={`סנן לפי ${name}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate group-hover:text-primary transition-colors">{name}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                    {count} <span className="text-[10px]">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${accent} transition-all group-hover:opacity-80`} style={{ width: `${w}%` }} />
                </div>
              </button>
            );
          })}
          {items.length > 8 && (
            <div className="text-[11px] text-muted-foreground pt-1 text-center">
              + עוד {items.length - 8} {items.length - 8 === 1 ? "פריט" : "פריטים"}
            </div>
          )}
        </div>

        {missingCount !== undefined && missingCount > 0 && (
          <button
            onClick={onMissingClick}
            disabled={!onMissingClick}
            className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] text-amber-700 bg-amber-50/60 hover:bg-amber-100/60 -mx-4 -mb-4 px-4 py-2 rounded-b-lg w-[calc(100%+2rem)] transition-colors disabled:cursor-default disabled:hover:bg-amber-50/60"
          >
            <span className="flex items-center gap-1"><AlertCircle className="size-3" /> {missingLabel}</span>
            <span className="font-bold tabular-nums">{missingCount}</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}



function MultiSelectFilter({
  label, placeholder, options, selected, onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const summary =
    selected.length === 0 ? placeholder
    : selected.length === 1 ? selected[0]
    : `${selected.length} נבחרו`;
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between font-normal h-9 px-3 ${selected.length > 0 ? "border-primary text-primary" : "text-muted-foreground"}`}
          type="button"
        >
          <span className="truncate flex items-center gap-1.5">
            <Filter className="size-3.5 opacity-70" />
            <span className="truncate">{summary}</span>
          </span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="mr-1 h-5 px-1.5 text-[10px]">{selected.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-xs font-semibold">{label}</div>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="text-[10px] text-primary hover:underline">נקה</button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {options.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">אין אפשרויות</div>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
