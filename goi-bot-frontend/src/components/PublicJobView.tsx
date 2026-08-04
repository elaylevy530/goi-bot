import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Target, Clock, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicJob, submitJobLead } from "@/lib/public-job.functions";
import { cityOf } from "@/lib/whatsapp/job-message-template";


export function PublicJobView({ refId }: { refId: string }) {
  const id = refId;
  const fetchJob = useServerFn(getPublicJob);
  const submit = useServerFn(submitJobLead);

  const jobQ = useQuery({
    queryKey: ["public-job", id],
    queryFn: () => fetchJob({ data: { id } }),
  });

  const [mode, setMode] = useState<"take" | "quote" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<null | "take" | "quote">(null);

  const send = useMutation({
    mutationFn: async () => {
      const current = jobQ.data;
      if (!mode || !current) return;
      if (name.trim().length < 2) throw new Error("נא למלא שם מלא");
      if (phone.replace(/\D/g, "").length < 9) throw new Error("נא למלא מספר טלפון תקין");
      if (mode === "quote" && !(Number(price) > 0)) throw new Error("נא למלא מחיר");
      await submit({
        data: {
          jobId: current.id,
          kind: mode,
          fullName: name.trim(),
          phone: phone.trim(),
          price: mode === "quote" ? Number(price) : null,
          note: note.trim() || null,
        },
      });
    },
    onSuccess: () => {
      setDone(mode);
      toast.success("נשלח! ניצור איתך קשר");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (jobQ.isLoading) {
    return (
      <div dir="rtl" className="min-h-dvh grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const job = jobQ.data;
  if (!job) {
    return (
      <div dir="rtl" className="min-h-dvh grid place-items-center p-6 text-center">
        <p className="text-muted-foreground">העבודה לא נמצאה או שאינה זמינה יותר.</p>
      </div>
    );
  }

  const isMove = job.service_category === "small_move" || job.service_category === "big_move";
  const fromCity = cityOf(job.pickup_area, job.pickup_address);
  const toCity = cityOf(job.dropoff_area, job.dropoff_address);
  const when = [job.job_date, job.job_time].filter(Boolean).join(" ") || "עכשיו";

  return (
    <div dir="rtl" className="min-h-dvh bg-muted/30 py-6 px-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold">
            {isMove ? "הובלה חדשה" : "משלוח חדש"}
            {fromCity ? ` מ${fromCity}` : ""}
          </h1>
          {job.job_number && (
            <p className="text-xs text-muted-foreground">מספר עבודה #{job.job_number}</p>
          )}
        </header>

        <Card>
          <CardContent className="p-4 space-y-3 text-sm">
            <Row icon={<MapPin className="size-4 text-primary" />} label="איסוף"
              value={[job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—"} />
            <Row icon={<Target className="size-4 text-primary" />} label="מסירה"
              value={[job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—"} />
            <Row icon={<Clock className="size-4 text-primary" />} label="מועד" value={when} />
            {(job.package_type || job.number_of_packages) && (
              <Row icon={<Package className="size-4 text-primary" />} label="תכולה"
                value={[job.package_type, job.number_of_packages && job.number_of_packages > 1 ? `× ${job.number_of_packages}` : "", job.package_size]
                  .filter(Boolean).join(" · ")} />
            )}
            {job.estimated_distance_km != null && (
              <Row icon={<span className="text-sm">📏</span>} label="מרחק"
                value={`${Number(job.estimated_distance_km).toFixed(1)} ק"מ`} />
            )}
            {job.description && (
              <p className="text-muted-foreground border-t pt-3">{job.description}</p>
            )}
            {job.price ? (
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-muted-foreground">מחיר לביצוע</span>
                <span className="text-xl font-bold">₪{job.price}</span>
              </div>
            ) : (
              <div className="border-t pt-3 text-muted-foreground">מחיר: לפי הצעה</div>
            )}
            {toCity && <p className="text-xs text-muted-foreground">יעד: {toCity}</p>}
          </CardContent>
        </Card>

        {job.taken ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <CheckCircle2 className="size-10 text-muted-foreground mx-auto" />
              <p className="font-semibold">העבודה כבר נתפסה</p>
              <p className="text-sm text-muted-foreground">
                לא ניתן לשלוח יותר הצעות עבור העבודה הזו.
              </p>
            </CardContent>
          </Card>
        ) : done ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
              <p className="font-semibold">
                {done === "take" ? "רשמנו שלקחת את העבודה" : "ההצעה נשלחה"}
              </p>
              <p className="text-sm text-muted-foreground">ניצור איתך קשר בוואטסאפ בהקדם.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-3">
              {!mode && (
                <div className="grid gap-2">
                  {job.price ? (
                    <Button size="lg" onClick={() => setMode("take")}>
                      אני לוקח את העבודה ב-₪{job.price}
                    </Button>
                  ) : null}
                  <Button size="lg" variant={job.price ? "outline" : "default"} onClick={() => setMode("quote")}>
                    שלח הצעת מחיר
                  </Button>
                </div>
              )}

              {mode && (
                <div className="space-y-3">
                  <p className="font-semibold text-sm">
                    {mode === "take" ? `לקיחת העבודה ב-₪${job.price}` : "הצעת מחיר"}
                  </p>
                  <div>
                    <Label>שם מלא</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שלך" />
                  </div>
                  <div>
                    <Label>טלפון</Label>
                    <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05X-XXXXXXX" />
                  </div>
                  {mode === "quote" && (
                    <div>
                      <Label>המחיר שלך (₪)</Label>
                      <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                    </div>
                  )}
                  <div>
                    <Label>הערה (אופציונלי)</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="זמינות, כמות עובדים, וכו׳" />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => send.mutate()} disabled={send.isPending}>
                      {send.isPending && <Loader2 className="size-4 animate-spin" />} שלח
                    </Button>
                    <Button variant="ghost" onClick={() => setMode(null)}>ביטול</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">GOI</p>

      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
