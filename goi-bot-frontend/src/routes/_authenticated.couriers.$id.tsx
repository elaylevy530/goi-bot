import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CourierStatusBadge } from "@/components/StatusBadges";
import { nestGetCourier, nestUpdateCourier } from "@/lib/nest-accounts";
import {
  nestListAreas, nestListCourierTags, nestListAllTags, nestAddCourierTag, nestRemoveCourierTag,
  nestListCourierWhatsappMessages, nestListCourierEntityStatusLogs,
} from "@/lib/nest-domain";
import { nestListJobs } from "@/lib/nest-jobs";
import { reclassifyCourier, approveCourier, getIdPhotoSignedUrl, deleteCourier } from "@/lib/courier-intake.functions";
import { ProvisionAccountButton } from "@/components/ProvisionAccountButton";
import {
  ArrowRight, MessageCircle, Save, Pencil, Wand2, X, Plus, Loader2, ShieldCheck, IdCard, Trash2, Copy, Pause, Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  COURIER_STATUSES, VEHICLE_TYPES, INVOICE_STATUS, JOB_TYPES, AVAILABILITY,
  type CourierStatus,
} from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/couriers/$id")({
  head: () => ({ meta: [{ title: "פרופיל שליח — Goi" }] }),
  component: CourierProfile,
});

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function CredentialsCard({ courier }: { courier: any }) {
  const phone = String(courier.whatsapp_phone ?? "");
  const digits = phone.replace(/\D/g, "");
  const loginPhone = digits.startsWith("972") ? digits : digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  const pwd: string | null = courier.last_temp_password ?? null;
  const setAt: string | null = courier.password_set_at ?? null;
  const hasAccount = !!courier.user_id;
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/courier-login` : "/courier-login";

  const copy = async (text: string, label = "הועתק") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };
  const copyAll = () => {
    const text = `אזור אישי לשליחים\nכתובת: ${loginUrl}\nטלפון: ${loginPhone}\nסיסמה: ${pwd ?? "(לא ידועה — אפס סיסמה)"}`;
    copy(text, "כל הפרטים הועתקו");
  };
  const sendWA = () => {
    const text = `שלום! זה הקישור לאזור האישי שלך ב-Goi:\n${loginUrl}\nטלפון: ${loginPhone}\nסיסמה: ${pwd ?? "(אפס סיסמה במערכת)"}\nמומלץ לשנות אותה בהגדרות הפרופיל.`;
    window.open(`https://wa.me/${loginPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>פרטי כניסה לאזור האישי</CardTitle>
        {hasAccount ? <Badge variant="secondary">חשבון פעיל</Badge> : <Badge variant="outline">אין חשבון עדיין</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAccount && (
          <p className="text-sm text-muted-foreground">עדיין לא נוצר חשבון לשליח. השתמש בכפתור "צור חשבון לשליח" למעלה.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">קישור</div>
            <div className="font-mono break-all">{loginUrl}</div>
          </div>
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">שם משתמש (טלפון)</div>
            <div className="font-mono font-semibold">{loginPhone || "—"}</div>
          </div>
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">סיסמה</div>
            {pwd ? (
              <div className="font-mono font-extrabold text-lg">{pwd}</div>
            ) : (
              <div className="text-muted-foreground">לא ידועה — לחץ "אפס סיסמה" למעלה</div>
            )}
            {setAt && (
              <div className="text-[11px] text-muted-foreground mt-1">עודכן: {new Date(setAt).toLocaleString("he-IL")}</div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          ⚠️ הסיסמה מוצגת כאן כל עוד השליח לא שינה אותה בעצמו. לאחר שינוי בפרופיל — מומלץ לאפס מחדש כדי לקבל סיסמה חדשה.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyAll} disabled={!pwd}><Copy className="size-4" /> העתק הכל</Button>
          <Button variant="outline" size="sm" onClick={() => copy(loginPhone)}><Copy className="size-4" /> העתק טלפון</Button>
          <Button variant="outline" size="sm" onClick={() => pwd && copy(pwd)} disabled={!pwd}><Copy className="size-4" /> העתק סיסמה</Button>
          <Button size="sm" onClick={sendWA} disabled={!pwd}><MessageCircle className="size-4" /> שלח בוואטסאפ</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApproveButton({ id }: { id: string }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveCourier);
  const mut = useMutation({
    mutationFn: () => approve({ data: { id, suspended: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", id] });
      qc.invalidateQueries({ queryKey: ["couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["pending-couriers"] });
      toast.success("השליח אושר במצב מושהה — הפעל אותו ידנית כשצריך");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-1.5">
      {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
      אשר כמושהה
    </Button>
  );
}

function PauseCourierButton({ id, isPaused, status }: { id: string; isPaused: boolean; status?: string | null }) {
  const qc = useQueryClient();
  const isSuspended = status === "מושהה";
  const mut = useMutation({
    mutationFn: async () => {
      const patch = isSuspended
        ? { courier_status: "פעיל", is_paused: false, paused_at: null, paused_reason: null }
        : isPaused
        ? { is_paused: false, paused_at: null, paused_reason: null }
        : { is_paused: true, paused_at: new Date().toISOString() };
      await nestUpdateCourier(id, patch as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", id] });
      qc.invalidateQueries({ queryKey: ["couriers"] });
      toast.success(isSuspended ? "השליח הופעל לקבלת משלוחים" : isPaused ? "השליח חזר לקבל משלוחים" : "השליח הושהה — לא יקבל משלוחים (ללא הודעה אליו)");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      variant="outline"
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      className={isSuspended || isPaused
        ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
        : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"}
      title={isSuspended ? "הפעל שליח לקבלת משלוחים" : isPaused ? "שחרר השהיה — השליח יחזור לקבל משלוחים" : "השהה שקט — השליח לא יקבל משלוחים ולא יקבל שום הודעה"}
    >
      {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : isSuspended || isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
      {isSuspended ? "הפעל שליח" : isPaused ? "שחרר השהיה" : "השהה (שקט)"}
    </Button>
  );
}

function IdPhotoViewer({ path, label = "תמונת תעודת זהות" }: { path: string; label?: string }) {
  const sign = useServerFn(getIdPhotoSignedUrl);
  const { data, isLoading, error } = useQuery({
    queryKey: ["id-photo", path],
    queryFn: () => sign({ data: { path } }),
    staleTime: 4 * 60 * 1000,
  });
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
        <IdCard className="size-4" /> {label}
      </div>
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {error && <p className="text-xs text-destructive">שגיאה בטעינת התמונה</p>}
      {data?.url && (
        <a href={data.url} target="_blank" rel="noreferrer" className="block">
          <img src={data.url} alt={label} className="max-h-80 rounded border bg-white object-contain mx-auto" />
        </a>
      )}
    </div>
  );
}

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}


function EditCourierDialog({ courier }: { courier: any }) {
  const qc = useQueryClient();
  const reclassify = useServerFn(reclassifyCourier);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: courier.full_name,
    whatsapp_phone: courier.whatsapp_phone,
    base_city: courier.base_city ?? "",
    gender: courier.gender ?? "",
    vehicle_type: courier.vehicle_type ?? "קטנוע",
    invoice_status: courier.invoice_status ?? "לא",
    experience: courier.experience ?? "",
    courier_status: courier.courier_status as CourierStatus,
    working_areas: (courier.working_areas as string[]) ?? [],
    job_types: (courier.job_types as string[]) ?? [],
    availability: (courier.availability as string[]) ?? [],
    notes: courier.notes ?? "",
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas-list"],
    queryFn: async () => {
      const rows = await nestListAreas();
      return rows.map((a) => ({ name: a.name }));
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      await nestUpdateCourier(courier.id, {
        full_name: form.full_name,
        whatsapp_phone: form.whatsapp_phone,
        base_city: form.base_city || null,
        gender: form.gender || null,
        vehicle_type: form.vehicle_type,
        invoice_status: form.invoice_status,
        experience: form.experience || null,
        courier_status: form.courier_status,
        working_areas: form.working_areas,
        job_types: form.job_types,
        availability: form.availability,
        notes: form.notes || null,
      });
      await reclassify({ data: { id: courier.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", courier.id] });
      qc.invalidateQueries({ queryKey: ["courier-tags", courier.id] });
      qc.invalidateQueries({ queryKey: ["couriers"] });
      toast.success("השינויים נשמרו");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Pencil className="size-4" /> ערוך פרטים</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>עריכת שליח</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>שם מלא</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>וואטסאפ</Label><Input value={form.whatsapp_phone} onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })} /></div>
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
          <div><Label>ניסיון</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /></div>
          <div>
            <Label>סטטוס</Label>
            <Select value={form.courier_status} onValueChange={(v) => setForm({ ...form, courier_status: v as CourierStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COURIER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label className="mb-1.5 block">אזורי עבודה</Label>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => {
                const on = form.working_areas.includes(a.name);
                return (
                  <Badge key={a.name} variant={on ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setForm({ ...form, working_areas: toggle(form.working_areas, a.name) })}>
                    {a.name}
                  </Badge>
                );
              })}
              {areas.length === 0 && <span className="text-xs text-muted-foreground">הוסף אזורים בעמוד "אזורים וסיווגים"</span>}
            </div>
          </div>

          <div className="col-span-2">
            <Label className="mb-1.5 block">סוגי עבודה</Label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map((j) => {
                const on = form.job_types.includes(j);
                return (
                  <Badge key={j} variant={on ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setForm({ ...form, job_types: toggle(form.job_types, j) })}>{j}</Badge>
                );
              })}
            </div>
          </div>

          <div className="col-span-2">
            <Label className="mb-1.5 block">זמינות</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABILITY.map((a) => {
                const on = form.availability.includes(a);
                return (
                  <Badge key={a} variant={on ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setForm({ ...form, availability: toggle(form.availability, a) })}>{a}</Badge>
                );
              })}
            </div>
          </div>

          <div className="col-span-2">
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} שמור וסווג מחדש
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagsCard({ courierId }: { courierId: string }) {
  const qc = useQueryClient();
  const reclassify = useServerFn(reclassifyCourier);

  const { data: courierTags = [] } = useQuery({
    queryKey: ["courier-tags", courierId],
    queryFn: () => nestListCourierTags(courierId),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => nestListAllTags(),
  });

  const assignedIds = new Set(courierTags.map((t) => t.tag_id));

  const addTag = useMutation({
    mutationFn: async (tag_id: string) => { await nestAddCourierTag(courierId, tag_id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-tags", courierId] }),
  });
  const removeTag = useMutation({
    mutationFn: async (tag_id: string) => { await nestRemoveCourierTag(courierId, tag_id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-tags", courierId] }),
  });
  const rerun = useMutation({
    mutationFn: async () => reclassify({ data: { id: courierId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["courier-tags", courierId] });
      toast.success(`סווג מחדש — ${r.tagCount} תגיות`);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>תגיות</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
          {rerun.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} סווג מחדש
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {courierTags.length === 0 && <span className="text-xs text-muted-foreground">אין תגיות עדיין</span>}
          {courierTags.map((t: any) => (
            <Badge key={t.tag_id} variant={t.assigned_automatically ? "secondary" : "default"} className="gap-1">
              {t.tags?.name}
              <X className="size-3 cursor-pointer hover:text-destructive" onClick={() => removeTag.mutate(t.tag_id)} />
            </Badge>
          ))}
        </div>
        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground mb-1.5">הוסף תגית ידנית:</div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.filter((t) => !assignedIds.has(t.id)).map((t) => (
              <Badge key={t.id} variant="outline" className="cursor-pointer hover:bg-muted"
                onClick={() => addTag.mutate(t.id)}>
                <Plus className="size-3" /> {t.name}
              </Badge>
            ))}
            {allTags.length === assignedIds.size && <span className="text-xs text-muted-foreground">כל התגיות כבר משויכות</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CourierProfile() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: c, isLoading } = useQuery({
    queryKey: ["courier", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const data = await nestGetCourier(id);
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["courier-messages", id],
    refetchInterval: 30_000,
    queryFn: () => nestListCourierWhatsappMessages(id),
  });
  const { data: jobsHistory = [] } = useQuery({
    queryKey: ["courier-jobs", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const all = await nestListJobs({ limit: 500 });
      return all
        .filter((j) => j.selected_courier_id === id)
        .slice(0, 50)
        .map((j) => ({
          job_number: j.job_number,
          job_type: j.job_type,
          status: j.status,
          payment: j.payment,
          created_at: j.created_at,
        }));
    },
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["courier-logs", id],
    refetchInterval: 30_000,
    queryFn: () => nestListCourierEntityStatusLogs(id),
  });


  const [notes, setNotes] = useState("");
  useEffect(() => { if (c?.notes !== undefined) setNotes(c.notes ?? ""); }, [c?.notes]);

  const saveNotes = useMutation({
    mutationFn: async () => { await nestUpdateCourier(id, { notes }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courier", id] }); toast.success("הערות נשמרו"); },
  });

  const navigate = useNavigate();
  const del = useServerFn(deleteCourier);
  const deleteMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("השליח נמחק מהמערכת");
      navigate({ to: "/couriers" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const onDelete = () => {
    if (window.confirm(`למחוק את ${c?.full_name} מהמערכת? פעולה זו לא ניתנת לביטול.`)) {
      deleteMut.mutate();
    }
  };

  if (isLoading) return <AdminLayout title="טוען...">…</AdminLayout>;
  if (!c) return <AdminLayout title="שליח לא נמצא"><Button asChild variant="outline"><Link to="/couriers-admin">חזרה</Link></Button></AdminLayout>;

  return (
    <AdminLayout
      title={`${c.full_name} · ${(c as any).courier_kind === "mover" ? "מוביל" : "שליח"}`}
      subtitle={`${(c as any).courier_kind === "mover" ? "הובלות קטנות" : "משלוחים"} · ${c.base_city ?? ""} · ${c.whatsapp_phone}`}
      actions={
        <>
          <Button asChild variant="outline"><Link to="/couriers-admin"><ArrowRight className="size-4" /> חזרה</Link></Button>
          <EditCourierDialog courier={c} />
          {c.courier_status === "ממתין לאישור" && <ApproveButton id={id} />}
          <PauseCourierButton id={id} isPaused={!!(c as any).is_paused} status={c.courier_status} />
          <ProvisionAccountButton courierId={id} hasAccount={!!c.user_id} phone={c.whatsapp_phone} />
          <Button variant="outline" onClick={() => {
            const phone = c.whatsapp_phone.replace(/\D/g, "").replace(/^0/, "972");
            window.open(`https://wa.me/${phone}`, "_blank");
          }}>
            <MessageCircle className="size-4" /> וואטסאפ
          </Button>
          <Button variant="outline" onClick={onDelete} disabled={deleteMut.isPending} className="text-destructive border-destructive/40 hover:bg-destructive/10">
            {deleteMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} מחק
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>פרטי שליח</CardTitle>
            <div className="flex items-center gap-2">
              {((c as any).is_paused || c.courier_status === "מושהה") && (
                <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/30">
                  <Pause className="size-3 ml-1" /> מושהה — לא מקבל משלוחים
                </Badge>
              )}
              <CourierStatusBadge status={c.courier_status as CourierStatus} />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <Detail label="שם מלא" value={c.full_name} />
            <Detail label="וואטסאפ" value={<span className="font-mono">{c.whatsapp_phone}</span>} />
            <Detail label="עיר מגורים" value={c.base_city ?? "—"} />
            <Detail label="מספר ת״ז" value={c.id_number ? <span className="font-mono">{c.id_number}</span> : "—"} />
            <Detail label="מין" value={c.gender ?? "—"} />
            <Detail label="רכב (גרסת שליח)" value={c.vehicle_label ?? c.vehicle_type ?? "—"} />
            <Detail label="רכב (מסווג)" value={c.vehicle_type ?? "—"} />
            <Detail label="תיק / ארגז משלוחים" value={c.delivery_bag ?? "—"} />
            <Detail label="מרחק עבודה מועדף" value={c.max_distance?.join(", ") ?? "—"} />
            <Detail label="חשבונית" value={c.invoice_status ?? "—"} />
            <Detail label="ניסיון" value={c.experience ?? "—"} />
            <Detail label="מקור ליד" value={c.lead_source ?? "—"} />
            <Detail label="יתרה" value={`${Number(c.balance).toFixed(2)} ₪`} />
            <Detail label="נרשם בתאריך" value={new Date(c.created_at).toLocaleDateString("he-IL")} />
            <div className="col-span-2 md:col-span-3">
              <Detail label="אזורי עבודה רצויים" value={(c.working_areas as string[]).join(", ") || "—"} />
              {(c as any).custom_work_area && (
                <div className="text-xs text-muted-foreground mt-1">נוסף ידני: {(c as any).custom_work_area}</div>
              )}
            </div>
            <div className="col-span-2 md:col-span-3">
              <Detail label="אזורי איסוף" value={((c as any).pickup_areas as string[] | null)?.join(", ") || "—"} />
              {(c as any).custom_pickup_area && (
                <div className="text-xs text-muted-foreground mt-1">נוסף ידני: {(c as any).custom_pickup_area}</div>
              )}
            </div>
            <div className="col-span-2 md:col-span-3">
              <Detail label="אזורי מסירה" value={((c as any).dropoff_areas as string[] | null)?.join(", ") || "—"} />
              {(c as any).custom_dropoff_area && (
                <div className="text-xs text-muted-foreground mt-1">נוסף ידני: {(c as any).custom_dropoff_area}</div>
              )}
            </div>
            <Detail label="מרחק מבסיס" value={(c as any).work_distance_from_base ?? "—"} />
            <Detail label="כלי עבודה" value={((c as any).vehicle_types as string[] | null)?.join(", ") || c.vehicle_type || "—"} />
            <Detail label="ניסיון" value={(c as any).courier_experience_status ?? "—"} />
            <Detail label="ותק" value={(c as any).courier_experience_duration ?? "—"} />
            <div className="col-span-2 md:col-span-3">
              <Detail label="סוגי עבודה" value={(c.job_types as string[]).join(", ") || "—"} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <Detail label="זמינות" value={(c.availability as string[]).join(", ") || "—"} />
            </div>
            {c.id_photo_url && (
              <div className="col-span-2 md:col-span-3">
                <IdPhotoViewer path={c.id_photo_url} label="תעודת זהות — צד קדמי" />
              </div>
            )}
            {(c as any).id_photo_back_url && (
              <div className="col-span-2 md:col-span-3">
                <IdPhotoViewer path={(c as any).id_photo_back_url} label="תעודת זהות — צד אחורי" />
              </div>
            )}
          </CardContent>
        </Card>

        <TagsCard courierId={id} />
      </div>

      <CredentialsCard courier={c} />


      <Card className="mt-6">
        <CardHeader><CardTitle>הערות פנימיות</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הוסף הערה על השליח..." rows={4} />
          <Button onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
            <Save className="size-4" /> שמור
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Tabs defaultValue="messages">
            <TabsList className="m-4">
              <TabsTrigger value="messages">היסטוריית וואטסאפ ({messages.length})</TabsTrigger>
              <TabsTrigger value="jobs">עבודות ({jobsHistory.length})</TabsTrigger>
              <TabsTrigger value="status">היסטוריית סטטוס ({logs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="messages" className="p-6 pt-2">
              {messages.length === 0 ? <p className="text-sm text-muted-foreground">אין הודעות עדיין.</p> : (
                <ul className="space-y-2">
                  {messages.map((m) => (
                    <li key={m.id} className="text-sm border rounded p-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{m.direction === "outbound" ? "→ נשלח" : "← נכנס"} · {m.delivery_status}</span>
                        <span>{new Date(m.created_at).toLocaleString("he-IL")}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="jobs" className="p-6 pt-2">
              {jobsHistory.length === 0 ? <p className="text-sm text-muted-foreground">לא קיבל עבודות עדיין.</p> : (
                <ul className="space-y-2 text-sm">
                  {jobsHistory.map((j, i) => (
                    <li key={i} className="border rounded p-3 flex justify-between">
                      <span>{j.job_number} · {j.job_type}</span>
                      <span>{j.payment} ₪ · {j.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="status" className="p-6 pt-2">
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">אין היסטוריה עדיין.</p> : (
                <ul className="space-y-2 text-sm">
                  {logs.map((l) => (
                    <li key={l.id}>• {new Date(l.created_at).toLocaleString("he-IL")} — {l.old_status ?? "(חדש)"} → {l.new_status}</li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
