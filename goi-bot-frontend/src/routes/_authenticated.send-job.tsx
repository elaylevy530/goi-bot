import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nestListAreas, nestSendWhatsapp } from "@/lib/nest-domain";
import { nestListCouriers } from "@/lib/nest-accounts";
import { nestCreateJob } from "@/lib/nest-jobs";
import { JOB_TYPES, VEHICLE_TYPES } from "@/lib/constants";
import { Copy, MessageCircle, CheckCheck, Search, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";

export const Route = createFileRoute("/_authenticated/send-job")({
  head: () => ({ meta: [{ title: "שליחת עבודה — Goi" }] }),
  component: SendJobPage,
});

function SendJobPage() {
  const qc = useQueryClient();
  const dispatch = useServerFn(dispatchJobToCouriers);
  const [jobType, setJobType] = useState<string>("משלוח בודד");
  const [pickup, setPickup] = useState<string>("");
  const [dropoff, setDropoff] = useState<string>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState("");
  const [description, setDescription] = useState("");
  const [vehicle, setVehicle] = useState("any");
  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [couriersNeeded, setCouriersNeeded] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: nestListAreas,
  });

  const { data: allCouriers = [] } = useQuery({
    queryKey: ["couriers-all"],
    queryFn: () => nestListCouriers({ limit: 1000 }),
    refetchInterval: 30000,
  });

  const matching = useMemo(() => {
    return allCouriers.filter((c) => {
      const areas = (c.working_areas as string[]) || [];
      const jobs = (c.job_types as string[]) || [];
      if (pickup && dropoff && !areas.includes(pickup) && !areas.includes(dropoff)) return false;
      if (vehicle !== "any" && c.vehicle_type !== vehicle) return false;
      if (jobType && jobs.length > 0 && !jobs.includes(jobType)) return false;
      if (invoiceRequired && c.invoice_status !== "כן") return false;
      if (!["פעיל", "נרשם", "שלחתי עבודה", "לקח עבודה"].includes(c.courier_status as string)) return false;
      return true;
    });
  }, [allCouriers, pickup, dropoff, vehicle, jobType, invoiceRequired]);

  const message = `🚀 עבודה חדשה ב-Goi!
סוג: ${jobType}
איסוף: ${pickup || "—"} → מסירה: ${dropoff || "—"}
תאריך: ${date || "—"} שעה: ${time || "—"}
תשלום: ${payment || "—"} ₪
${description ? `הערות: ${description}\n` : ""}רוצה לקחת? השב 1.`;

  const createJob = useMutation({
    mutationFn: async () => {
      const data = await nestCreateJob({
        job_type: jobType as "משלוח בודד",
        customer_name: customerName || null,
        pickup_area: pickup || null,
        dropoff_area: dropoff || null,
        job_date: date || null,
        job_time: time || null,
        payment: payment ? Number(payment) : 0,
        description: description || null,
        vehicle_required: vehicle === "any" ? null : (vehicle as "קטנוע"),
        invoice_required: invoiceRequired,
        couriers_needed: couriersNeeded,
        matching_couriers_count: matching.length,
        status: "נשלחה לשליחים",
      });
      // Nest dispatch creates offer_events + push/WhatsApp fan-out
      try {
        const res = await dispatch({ data: { jobId: data.id } });
        if (res?.sent) toast.success(`נשלח ל-${res.sent} שליחים ✅`);
        else toast.message("העבודה נוצרה — אין שליחים תואמים כרגע");
      } catch (e) {
        console.error("dispatch", e);
        toast.error("שיגור נכשל: " + (e as Error).message);
      }
      return data;
    },
    onSuccess: (d) => {
      setCreatedJobId(d.id);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("עבודה נוצרה ונשלחה לשליחים");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logSent = useMutation({
    mutationFn: async ({ courierId, phone }: { courierId: string; phone: string }) => {
      if (!createdJobId) throw new Error("שמור קודם את העבודה");
      await nestSendWhatsapp({
        phone,
        message,
        courier_id: courierId,
        job_id: createdJobId,
        log_only: true,
      });
    },
    onSuccess: (_, vars) => {
      setSentTo((p) => new Set(p).add(vars.courierId));
      toast.success("סומן כנשלח");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyMsg = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("הודעה הועתקה");
  };
  const openWA = (phone: string) => {
    const clean = phone.replace(/\D/g, "").replace(/^0/, "972");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <AdminLayout title="שליחת עבודה ידנית" subtitle="צור עבודה והפץ אותה לשליחים מתאימים">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>פרטי העבודה</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>שם מזמין</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="שם או עסק" /></div>
            <div>
              <Label>סוג עבודה</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>רכב נדרש</Label>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">ללא העדפה</SelectItem>
                  {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>אזור איסוף</Label>
              <Select value={pickup} onValueChange={setPickup}>
                <SelectTrigger><SelectValue placeholder="בחר אזור" /></SelectTrigger>
                <SelectContent>{areas.map((a) => <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>אזור מסירה</Label>
              <Select value={dropoff} onValueChange={setDropoff}>
                <SelectTrigger><SelectValue placeholder="בחר אזור" /></SelectTrigger>
                <SelectContent>{areas.map((a) => <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תאריך</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>שעה</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            <div><Label>תשלום (₪)</Label><Input type="number" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0" /></div>
            <div><Label>מספר שליחים נדרש</Label><Input type="number" min={1} value={couriersNeeded} onChange={(e) => setCouriersNeeded(+e.target.value)} /></div>
            <div className="md:col-span-2"><Label>תיאור</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="md:col-span-2 flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="font-medium text-sm">דרישת חשבונית</div>
                <div className="text-xs text-muted-foreground">רק שליחים עם חשבונית</div>
              </div>
              <Switch checked={invoiceRequired} onCheckedChange={setInvoiceRequired} />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <div className="flex-1 text-sm text-muted-foreground self-center">
                {matching.length} שליחים מתאימים נמצאו
              </div>
              <Button onClick={() => createJob.mutate()} disabled={createJob.isPending}>
                {createJob.isPending && <Loader2 className="size-4 animate-spin" />}
                <Save className="size-4" /> שמור עבודה
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>תצוגת הודעה</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-muted p-4 rounded-md leading-relaxed">{message}</pre>
            <Button variant="outline" className="mt-3 w-full" onClick={copyMsg}><Copy className="size-4" /> העתק</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            שליחים מתאימים <Badge className="bg-primary text-primary-foreground">{matching.length}</Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2"><Search className="size-4" />חיפוש לפי הסינון למעלה</div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>שם</TableHead><TableHead>טלפון</TableHead><TableHead>רכב</TableHead>
              <TableHead>אזורים</TableHead><TableHead>סטטוס</TableHead><TableHead className="text-end">פעולות</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {matching.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">לא נמצאו שליחים מתאימים.</TableCell></TableRow>
              )}
              {matching.map((c) => {
                const sent = sentTo.has(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.whatsapp_phone}</TableCell>
                    <TableCell>{c.vehicle_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">{(c.working_areas as string[]).join(", ")}</TableCell>
                    <TableCell><Badge variant="outline">{c.courier_status}</Badge></TableCell>
                    <TableCell className="text-end">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openWA(c.whatsapp_phone)}>
                          <MessageCircle className="size-4" /> וואטסאפ
                        </Button>
                        <Button size="sm" variant={sent ? "secondary" : "default"}
                          onClick={() => createdJobId
                            ? logSent.mutate({ courierId: c.id, phone: c.whatsapp_phone })
                            : toast.error("שמור קודם את העבודה")}
                          disabled={sent}>
                          <CheckCheck className="size-4" /> {sent ? "נשלח" : "סמן כנשלח"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
