import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessShell, useMyBusiness } from "@/components/BusinessShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JobStatusBadge } from "@/components/StatusBadges";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Copy, MessageSquare, Phone, XCircle, AlertCircle, MapPin, User, Package, Wallet, Navigation, Share2, UserPlus, Star, Heart, Ban } from "lucide-react";
import { CourierAvatar } from "@/components/CourierAvatar";


import { toast } from "sonner";
import type { JobStatus } from "@/lib/constants";
import { useServerFn } from "@tanstack/react-start";
import { dispatchJobToCouriers } from "@/lib/dispatch-job.functions";
import { geocodeJob } from "@/lib/geocode-job.functions";

export const Route = createFileRoute("/business/order/$id")({
  head: () => ({ meta: [{ title: "פרטי משלוח — Goi" }] }),
  ssr: false,
  component: OrderDetailPage,
});

const TIMELINE_STEPS = [
  "נוצרה הזמנה",
  "נשלחה לשליחים",
  "שליח אישר",
  "יצאתי לאיסוף",
  "אספתי",
  "נמסר",
  "הושלם",
];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyBusiness();
  const dispatchFn = useServerFn(dispatchJobToCouriers);
  const geocodeFn = useServerFn(geocodeJob);

  const { data: job } = useQuery({
    queryKey: ["order", id, me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase.from("jobs")
        .select("*, couriers:selected_courier_id(id, full_name, whatsapp_phone, vehicle_type, vehicle_label, base_city, id_photo_url, avatar_url)")
        .eq("id", id).eq("customer_id", me!.id).maybeSingle();
      return data;
    },
  });

  const { data: courierStats } = useQuery({
    queryKey: ["courier-stats", (job as any)?.selected_courier_id],
    enabled: !!(job as any)?.selected_courier_id,
    queryFn: async () => {
      const cid = (job as any).selected_courier_id;
      const { data } = await supabase.from("courier_stats")
        .select("avg_rating, jobs_completed, acceptance_rate, on_time_rate")
        .eq("courier_id", cid).maybeSingle();
      return data;
    },
  });

  const courierId = (job as any)?.selected_courier_id as string | undefined;
  const { data: favorite } = useQuery({
    queryKey: ["favorite", me?.id, courierId],
    enabled: !!me?.id && !!courierId,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_favorite_couriers" as any)
        .select("id, status")
        .eq("business_id", me!.id)
        .eq("courier_id", courierId!)
        .maybeSingle();
      return data as { id: string; status: "preferred" | "blocked" } | null;
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (next: "preferred" | "blocked" | "none") => {
      if (!me?.id || !courierId) throw new Error("no courier");
      if (next === "none") {
        const { error } = await supabase
          .from("business_favorite_couriers" as any)
          .delete()
          .eq("business_id", me.id)
          .eq("courier_id", courierId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("business_favorite_couriers" as any)
          .upsert(
            { business_id: me.id, courier_id: courierId, status: next } as any,
            { onConflict: "business_id,courier_id" },
          );
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["favorite", me?.id, courierId] });
      toast.success(
        next === "preferred" ? "השליח נשמר במועדפים — נשלח אליו ראשון בהזמנה הבאה"
        : next === "blocked" ? "השליח נחסם — לא יקבל ממך הזמנות"
        : "הוסר מהמועדפים",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });



  const { data: logs } = useQuery({
    queryKey: ["order-logs", id],
    enabled: !!job,
    queryFn: async () => {
      const { data } = await supabase.from("status_logs")
        .select("*").eq("entity_type", "job").eq("entity_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("חסר פרופיל");
      const { error } = await supabase.from("jobs")
        .update({ status: "בוטלה" as never })
        .eq("id", id).eq("customer_id", me.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("המשלוח בוטל"); qc.invalidateQueries({ queryKey: ["order", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      if (!job || !me) throw new Error("no job");
      const { id: _i, created_at, updated_at, job_number, status, selected_courier_id, selected_quote_id, ...rest } = job as any;
      const { data, error } = await supabase.from("jobs")
        .insert({ ...rest, customer_id: me.id, status: "נשלחה לשליחים" })
        .select("id, pricing_type").single();
      if (error) throw new Error(error.message);
      geocodeFn({ data: { jobId: data.id } }).catch((e) => console.error("geocode", e));
      if ((data as any).pricing_type !== "quote_request") {
        try { await dispatchFn({ data: { jobId: data.id } }); } catch (e) { console.error("dispatch", e); }
      }
      return data;
    },
    onSuccess: (data) => { toast.success("המשלוח שוכפל ונשלח לשליחים"); navigate({ to: "/business/order/$id", params: { id: data.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // contact dialog


  const saveRecipient = useMutation({
    mutationFn: async () => {
      if (!job || !me) throw new Error("no job");
      const j: any = job;
      if (!j.recipient_name) throw new Error("אין שם נמען");
      const { error } = await supabase.from("saved_contacts" as any).insert({
        business_id: me.id, contact_name: j.recipient_name, phone: j.recipient_phone || null,
        city: j.dropoff_area || null, full_address: j.dropoff_address || null, notes: j.dropoff_notes || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("הנמען נשמר באנשי הקשר"),
    onError: (e: Error) => toast.error(e.message),
  });

  // Rating + tip
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [tip, setTip] = useState<number>(0);

  const { data: outcome } = useQuery({
    queryKey: ["job-outcome", id],
    enabled: !!job,
    queryFn: async () => {
      const { data } = await supabase.from("job_outcomes").select("*").eq("job_id", id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!me?.id || !id) return;
    const channel = supabase
      .channel(`business-order-live-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["order", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "status_logs", filter: `entity_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["order-logs", id] });
        qc.invalidateQueries({ queryKey: ["order", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "job_outcomes", filter: `job_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["job-outcome", id] });
        qc.invalidateQueries({ queryKey: ["order", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, me?.id, qc]);

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!job || !me) throw new Error("no job");
      if (!rating) throw new Error("בחר/י דירוג");
      const { error } = await supabase.from("job_outcomes").upsert({
        job_id: id, courier_id: (job as any).selected_courier_id,
        customer_rating: rating, customer_comment: feedback || null,
      } as any, { onConflict: "job_id" });
      if (error) throw new Error(error.message);
      if (tip > 0) {
        await supabase.from("jobs").update({ tip_amount: tip } as any).eq("id", id);
      }
    },
    onSuccess: () => { toast.success("תודה על הדירוג!"); qc.invalidateQueries({ queryKey: ["job-outcome", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!job) return <BusinessShell title="טוען..."><div className="p-8 text-center text-slate-500">טוען...</div></BusinessShell>;

  const j: any = job;
  const courier = j.couriers;
  const canCancel = !["הושלמה", "בוטלה"].includes(j.status);
  const logStatuses = new Set((logs ?? []).map((l: any) => l.new_status));
  const pickedUp = !!(outcome as any)?.picked_up_at;
  const delivered = !!(outcome as any)?.delivered_at;
  const ds: string = j.delivery_status || "";
  const dsRank: Record<string, number> = {
    assigned: 2, heading_to_pickup: 3, arrived_at_pickup: 3,
    picked_up: 4, heading_to_dropoff: 5, arrived_at_dropoff: 5, delivered: 6,
  };
  const dsLevel = dsRank[ds] ?? 0;
  const stepDone = (step: string) => {
    if (step === "נוצרה הזמנה") return true;
    if (step === "נשלחה לשליחים") return ["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו", "נבחר שליח", "פעילה", "הושלמה"].includes(j.status);
    if (step === "שליח אישר") return !!j.selected_courier_id || dsLevel >= 2 || ["נבחר שליח", "פעילה", "הושלמה"].includes(j.status);
    if (step === "יצאתי לאיסוף") return dsLevel >= 3 || logStatuses.has("בדרך לאיסוף") || logStatuses.has("הגעתי לאיסוף") || logStatuses.has("אספתי") || logStatuses.has("בדרך למסירה") || logStatuses.has("נמסר") || pickedUp || delivered || j.status === "הושלמה";
    if (step === "אספתי") return dsLevel >= 4 || logStatuses.has("אספתי") || logStatuses.has("נאסף") || logStatuses.has("בדרך למסירה") || logStatuses.has("נמסר") || pickedUp || delivered || j.status === "הושלמה";
    if (step === "נמסר") return dsLevel >= 6 || logStatuses.has("נמסר") || delivered || j.status === "הושלמה";
    if (step === "הושלם") return j.status === "הושלמה";
    return false;
  };

  const trackUrl = typeof window !== "undefined" && j.recipient_tracking_token
    ? `${window.location.origin}/track/${j.recipient_tracking_token}` : "";

  const shareTrack = async () => {
    if (!trackUrl) return;
    if (navigator.share) { try { await navigator.share({ title: `מעקב משלוח ${j.job_number}`, url: trackUrl }); } catch {} }
    else { await navigator.clipboard.writeText(trackUrl); toast.success("הקישור הועתק"); }
  };

  return (
    <BusinessShell title={`משלוח ${j.job_number}`} subtitle={j.job_type}>
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button asChild variant="ghost" size="sm"><Link to="/business/orders"><ArrowRight className="size-4" /> חזרה למשלוחים</Link></Button>
          <div className="flex gap-2 flex-wrap">
            <JobStatusBadge status={j.status as JobStatus} courierStep={j.courier_step} />
            <Button asChild variant="outline" size="sm"><Link to="/business/track/$id" params={{ id: j.id }}><Navigation className="size-4" /> מעקב חי</Link></Button>
            {trackUrl && <Button variant="outline" size="sm" onClick={shareTrack}><Share2 className="size-4" /> שתף עם הנמען</Button>}
            {courier?.whatsapp_phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`https://wa.me/${courier.whatsapp_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageSquare className="size-4" /> דבר עם השליח</a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => duplicate.mutate()}><Copy className="size-4" /> שכפל</Button>
            {j.recipient_name && <Button variant="outline" size="sm" onClick={() => saveRecipient.mutate()}><UserPlus className="size-4" /> שמור נמען</Button>}
            <Button asChild variant="outline" size="sm"><Link to="/business/support"><AlertCircle className="size-4" /> דווח בעיה</Link></Button>
            {canCancel && <Button variant="outline" size="sm" onClick={() => cancel.mutate()} className="text-red-600 border-red-200 hover:bg-red-50"><XCircle className="size-4" /> בטל</Button>}
          </div>
        </div>




        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><MapPin className="size-4 text-[#35AD29]" /> איסוף</h3>
                <div className="text-sm space-y-1.5 text-slate-700">
                  <Row label="כתובת" value={j.pickup_address || j.pickup_area} />
                  <Row label="עיר" value={j.pickup_city || j.pickup_area} />
                  <Row label="איש קשר" value={j.pickup_contact_name} />
                  <Row label="טלפון" value={j.pickup_contact_phone} />
                  <Row label="הערות" value={j.pickup_notes} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><MapPin className="size-4 text-rose-500" /> מסירה</h3>
                <div className="text-sm space-y-1.5 text-slate-700">
                  <Row label="כתובת" value={j.dropoff_address || j.dropoff_area} />
                  <Row label="עיר" value={j.dropoff_city || j.dropoff_area} />
                  <Row label="שם הנמען" value={j.recipient_name} />
                  <Row label="טלפון" value={j.recipient_phone} />
                  <Row label="הערות" value={j.dropoff_notes} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><Package className="size-4 text-slate-700" /> פריט וזמן</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Row label="סוג חבילה" value={j.package_type} />
                  <Row label="גודל" value={j.package_size} />
                  <Row label="כמות" value={j.number_of_packages} />
                  <Row label="שביר" value={j.fragile ? "כן" : "לא"} />
                  <Row label="תאריך" value={j.job_date} />
                  <Row label="שעה" value={j.job_time} />
                </div>
                {j.description && <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{j.description}</div>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {courier && (
              <Card className="rounded-2xl border-2 border-[#35AD29]/30 shadow-md bg-gradient-to-br from-emerald-50/60 to-white overflow-hidden">
                <div className="bg-[#35AD29] text-white px-5 py-2 text-xs font-extrabold flex items-center gap-2">
                  <User className="size-3.5" /> השליח שלך
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <CourierAvatar path={(courier as any).avatar_url} name={courier.full_name} size={64} />
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-lg text-slate-900 truncate">{courier.full_name}</div>
                      <div className="text-sm text-slate-600 flex items-center gap-1.5 flex-wrap">
                        {courier.vehicle_type && <span>🛵 {courier.vehicle_label || courier.vehicle_type}</span>}
                        {courier.base_city && <span className="text-slate-400">•</span>}
                        {courier.base_city && <span>📍 {courier.base_city}</span>}
                      </div>
                      {courierStats && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {courierStats.avg_rating != null && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              {Number(courierStats.avg_rating).toFixed(1)}
                            </span>
                          )}
                          {(courierStats.jobs_completed ?? 0) > 0 && (
                            <span className="text-slate-600 font-semibold">
                              {courierStats.jobs_completed} משלוחים
                            </span>
                          )}
                          {(courierStats as any).on_time_rate != null && (
                            <span className="text-blue-600 font-semibold">
                              {Math.round(Number((courierStats as any).on_time_rate) * 100)}% בזמן
                            </span>
                          )}
                          {courierStats.acceptance_rate != null && (
                            <span className="text-emerald-700 font-semibold">
                              {Math.round(Number(courierStats.acceptance_rate) * 100)}% קבלה
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {courier.whatsapp_phone && (
                    <div className="space-y-2">
                      <a
                        href={`https://wa.me/${courier.whatsapp_phone.replace(/\D/g, "").replace(/^0/, "972")}?text=${encodeURIComponent(`שלום ${courier.full_name?.split(" ")[0] || ""}, לגבי משלוח ${j.job_number}`)}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-2.5 rounded-xl transition-colors"
                      >
                        <MessageSquare className="size-4" /> שלח הודעת ווצאפ
                      </a>
                      <a
                        href={`tel:${courier.whatsapp_phone}`}
                        className="flex items-center justify-center gap-2 w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-bold py-2.5 rounded-xl transition-colors"
                      >
                        <Phone className="size-4 text-[#35AD29]" /> {courier.whatsapp_phone}
                      </a>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <Button
                      type="button"
                      variant={favorite?.status === "preferred" ? "default" : "outline"}
                      size="sm"
                      disabled={toggleFavorite.isPending}
                      onClick={() => toggleFavorite.mutate(favorite?.status === "preferred" ? "none" : "preferred")}
                      className={`flex-1 ${favorite?.status === "preferred" ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-rose-600 border-rose-200 hover:bg-rose-50"}`}
                    >
                      <Heart className={`size-4 ${favorite?.status === "preferred" ? "fill-white" : ""}`} />
                      {favorite?.status === "preferred" ? "במועדפים" : "שמור כמועדף"}
                    </Button>
                    <Button
                      type="button"
                      variant={favorite?.status === "blocked" ? "default" : "outline"}
                      size="sm"
                      disabled={toggleFavorite.isPending}
                      onClick={() => toggleFavorite.mutate(favorite?.status === "blocked" ? "none" : "blocked")}
                      className={favorite?.status === "blocked" ? "bg-slate-700 hover:bg-slate-800 text-white" : "text-slate-600"}
                      title="חסום שליח זה"
                    >
                      <Ban className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 text-center">
                    שליחים מועדפים מקבלים הזמנה ראשונים. אם לא לוקחים תוך {(me as any)?.favorites_fallback_minutes ?? 3} דק׳ — נשלח לכולם.
                  </p>
                </CardContent>
              </Card>
            )}



            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><Wallet className="size-4 text-slate-700" /> מחיר ותשלום</h3>
                <div className="text-sm space-y-1.5">
                  <Row label="מחיר ללקוח" value={`₪${Number(j.customer_price || j.final_price || j.payment || 0).toLocaleString("he-IL")}`} />
                  <Row label="תשלום לשליח" value={`₪${Number(j.payment || 0).toLocaleString("he-IL")}`} />
                  <Row label="עמלת Goi" value={`₪${Number(j.platform_fee || 0).toLocaleString("he-IL")}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">סטטוס</h3>
                <ol className="space-y-2">
                  {TIMELINE_STEPS.map((step) => {
                    const done = stepDone(step);
                    return (
                      <li key={step} className="flex items-center gap-2 text-sm">
                        <span className={`size-2.5 rounded-full ${done ? "bg-[#35AD29]" : "bg-slate-200"}`} />
                        <span className={done ? "text-slate-900 font-semibold" : "text-slate-400"}>{step}</span>
                      </li>
                    );
                  })}
                </ol>
                {logs && logs.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 max-h-40 overflow-y-auto">
                    {logs.map((l: any) => (
                      <div key={l.id} className="text-xs text-slate-500">
                        <span className="font-mono">{new Date(l.created_at).toLocaleString("he-IL")}</span> · {l.new_status}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {j.status === "הושלמה" && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2"><Star className="size-4 text-amber-500" /> דירוג השליח</h3>
                  {outcome?.customer_rating ? (
                    <div className="text-sm text-slate-700">
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3,4,5].map(n => <Star key={n} className={`size-5 ${n <= (outcome.customer_rating as any) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}
                      </div>
                      {outcome.customer_comment && <div className="text-xs text-slate-500 mt-1">{outcome.customer_comment}</div>}
                      {Number(j.tip_amount || 0) > 0 && <div className="text-xs text-emerald-600 font-bold mt-2">טיפ: ₪{j.tip_amount}</div>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`דירוג ${n}`}>
                            <Star className={`size-7 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"}`} />
                          </button>
                        ))}
                      </div>
                      <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="פידבק קצר (לא חובה)" />
                      <div>
                        <Label className="text-xs">טיפ לשליח (₪)</Label>
                        <div className="flex gap-2 mt-1">
                          {[0, 10, 20, 50].map(v => (
                            <Button key={v} type="button" variant="outline" size="sm" onClick={() => setTip(v)} className={tip === v ? "border-[#35AD29] text-[#35AD29]" : ""}>
                              {v === 0 ? "ללא" : `₪${v}`}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button onClick={() => submitRating.mutate()} disabled={submitRating.isPending || !rating} className="w-full bg-[#35AD29] hover:bg-[#2d9623] text-white">
                        שלח דירוג
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BusinessShell>
  );
}

function Row({ label, value }: { label: string; value?: any }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-semibold text-right">{value ?? "—"}</span>
    </div>
  );
}
