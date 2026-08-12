import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CourierShell, useMyCourier } from "@/components/CourierShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { nestSignedFileUrlResolved, nestUploadFile } from "@/lib/nest-files";
import { Loader2, Save, Camera, User, Bike, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/profile/edit")({
  head: () => ({ meta: [{ title: "עריכת פרופיל — Goi" }] }),
  component: EditProfilePage,
});

function initialsOf(name?: string | null) {
  if (!name) return "ש";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

function useAvatarUrl(courierId?: string, avatarPath?: string | null) {
  return useQuery({
    queryKey: ["courier-avatar-signed", courierId, avatarPath],
    enabled: !!courierId && !!avatarPath,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith("http")) return avatarPath;
      return nestSignedFileUrlResolved("courier-avatars", avatarPath, 60 * 60 * 24 * 7);
    },
  });
}

/**
 * Payload must match Nest `UpdateCourierSelfDto` exactly
 * (`forbidNonWhitelisted: true` on ValidationPipe).
 * Fields without DB columns (bio, birth_date, address, emergency_*) are not shown.
 */
function EditProfilePage() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [baseCity, setBaseCity] = useState("");
  const [workingAreas, setWorkingAreas] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [jobTypes, setJobTypes] = useState("");
  const [experience, setExperience] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const avatarPath = (me as { avatar_url?: string | null } | undefined)?.avatar_url;
  const { data: signedAvatarUrl } = useAvatarUrl(me?.id, avatarPath);

  useEffect(() => {
    if (!me) return;
    const row = me as {
      full_name?: string | null;
      whatsapp_phone?: string | null;
      email?: string | null;
      id_number?: string | null;
      base_city?: string | null;
      working_areas?: string[] | null;
      vehicle_type?: string | null;
      job_types?: string[] | null;
      courier_experience_duration?: string | null;
      notes?: string | null;
    };
    setFullName(row.full_name ?? "");
    setPhone(row.whatsapp_phone ?? "");
    setEmail(row.email ?? "");
    setIdNumber(row.id_number ?? "");
    setBaseCity(row.base_city ?? "");
    setWorkingAreas((row.working_areas ?? []).join(", "));
    setVehicle(row.vehicle_type ?? "");
    setJobTypes((row.job_types ?? []).join(", "));
    setExperience(row.courier_experience_duration ?? "");
    setNotes(row.notes ?? "");
  }, [me]);

  const onPickAvatar = (f: File | null) => {
    setAvatarFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setAvatarPreview(null);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!me) return;
      let newAvatarPath: string | undefined;
      if (avatarFile) {
        const uploaded = await nestUploadFile("courier-avatars", avatarFile);
        newAvatarPath = uploaded.path;
      }

      const payload: Record<string, unknown> = {
        full_name: fullName,
        email: email || null,
        id_number: idNumber || null,
        base_city: baseCity || null,
        working_areas: workingAreas.split(",").map((s) => s.trim()).filter(Boolean),
        vehicle_type: vehicle || null,
        job_types: jobTypes.split(",").map((s) => s.trim()).filter(Boolean),
        courier_experience_duration: experience.trim().slice(0, 60) || null,
        notes: notes || null,
      };
      if (newAvatarPath) payload.avatar_url = newAvatarPath;

      await nestUpdateMyCourier(payload);

      if (idFile) {
        await nestUploadFile("courier-ids", idFile);
      }
    },
    onSuccess: () => {
      toast.success("הפרופיל עודכן ✓");
      setAvatarFile(null);
      setAvatarPreview(null);
      setIdFile(null);
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      qc.invalidateQueries({ queryKey: ["courier-avatar-signed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (s?: string | null) => {
    if (s === "פעיל") return <Badge className="bg-emerald-100 text-emerald-800">מאושר</Badge>;
    if (s === "ממתין לאישור") return <Badge className="bg-amber-100 text-amber-800">ממתין לאישור</Badge>;
    if (s === "חסר פרטים") return <Badge className="bg-slate-100 text-slate-700">חסר פרטים</Badge>;
    return <Badge variant="outline">{s ?? "—"}</Badge>;
  };

  const displayAvatar = avatarPreview || signedAvatarUrl;

  const SectionTitle = ({ icon: Icon, title }: { icon: typeof User; title: string }) => (
    <div className="flex items-center gap-2 justify-end pb-1 border-b border-slate-100">
      <h2 className="font-extrabold text-slate-900">{title}</h2>
      <span className="size-7 grid place-items-center rounded-lg bg-emerald-50">
        <Icon className="size-4 text-[#35AD29]" />
      </span>
    </div>
  );

  return (
    <CourierShell title="הפרופיל שלי" subtitle="פרטים אישיים, רכב ומסמכים">
      <div className="space-y-4 max-w-3xl mx-auto pb-24">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/courier/profile")}
            className="gap-1 text-slate-700 hover:text-slate-900 -ml-2"
          >
            <ChevronRight className="size-4" />
            חזרה
          </Button>
        </div>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="size-28 rounded-full overflow-hidden ring-4 ring-emerald-100 bg-gradient-to-br from-[#35AD29] to-[#2d9623] text-white grid place-items-center text-3xl font-extrabold">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    initialsOf(fullName || me?.full_name)
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -left-1 size-9 rounded-full bg-white border border-slate-200 shadow grid place-items-center active:scale-95 transition"
                  aria-label="העלאת תמונה"
                >
                  <Camera className="size-4 text-slate-700" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="text-center">
                <div className="font-extrabold text-slate-900 text-lg">{fullName || "—"}</div>
                <div className="mt-1">{statusBadge(me?.courier_status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <SectionTitle icon={User} title="פרטים אישיים" />
            <div><Label className="text-end block mb-1">שם מלא</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-end" /></div>
            <div>
              <Label className="text-end block mb-1">טלפון וואטסאפ <span className="text-xs text-amber-600">(שינוי דורש אישור)</span></Label>
              <Input value={phone} disabled className="text-end" dir="ltr" />
            </div>
            <div><Label className="text-end block mb-1">אימייל</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-end" dir="ltr" /></div>
            <div><Label className="text-end block mb-1">תעודת זהות</Label><Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="text-end" dir="ltr" inputMode="numeric" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <SectionTitle icon={Bike} title="רכב ועבודה" />
            <div><Label className="text-end block mb-1">עיר בסיס</Label><Input value={baseCity} onChange={(e) => setBaseCity(e.target.value)} className="text-end" /></div>
            <div><Label className="text-end block mb-1">אזורי עבודה</Label><Input value={workingAreas} onChange={(e) => setWorkingAreas(e.target.value)} className="text-end" placeholder="תל אביב, רמת גן" /></div>
            <div><Label className="text-end block mb-1">כלי עבודה</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="text-end" placeholder="קטנוע / רכב / אופניים חשמליים" /></div>
            <div><Label className="text-end block mb-1">סוגי עבודות</Label><Input value={jobTypes} onChange={(e) => setJobTypes(e.target.value)} className="text-end" placeholder="אוכל, חבילות, מסמכים" /></div>
            <div><Label className="text-end block mb-1">ניסיון</Label><Input value={experience} onChange={(e) => setExperience(e.target.value)} className="text-end" placeholder="לדוגמה: שנתיים" maxLength={60} /></div>
            <div><Label className="text-end block mb-1">הערות</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-end" rows={2} /></div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <SectionTitle icon={FileText} title="מסמכים" />
            <div>
              <Label className="text-end block mb-1">סטטוס חשבונית/קבלה <span className="text-xs text-amber-600">(שינוי דורש אישור)</span></Label>
              <Input value={String((me as { invoice_status?: string | null } | undefined)?.invoice_status ?? "—")} disabled className="text-end" />
            </div>
            <div>
              <Label className="text-end block mb-1">תעודת זהות <span className="text-xs text-amber-600">(טעון לאישור)</span></Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-[#35AD29]">
                <Camera className="size-4" />
                <span className="text-sm">{idFile?.name ?? "העלה תמונה / PDF"}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-20 lg:bottom-4 z-10 px-1">
          <Button
            className="w-full h-12 text-base font-bold bg-[#35AD29] hover:bg-[#2d9623] text-white shadow-lg rounded-2xl"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} שמור שינויים
          </Button>
        </div>
      </div>
    </CourierShell>
  );
}
