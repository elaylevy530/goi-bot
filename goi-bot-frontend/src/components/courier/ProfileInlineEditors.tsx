import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  nestListMyCourierDocuments,
  nestUpdateMyCourier,
  nestUpdateMyCourierDocument,
} from "@/lib/nest-accounts";
import { nestUploadFile } from "@/lib/nest-files";
import { COURIER_DOCUMENT_TYPES, type CourierSelfRow } from "@/lib/courier-session";
import { cn } from "@/lib/utils";

function fieldLabel(cls?: string) {
  return cn("mb-1 block text-end text-xs font-bold text-slate-500", cls);
}

function SaveButton({ pending, label = "שמור" }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-pill bg-primary-deep text-sm font-extrabold text-primary-foreground disabled:opacity-60"
    >
      {pending ? "שומר…" : label}
    </button>
  );
}

export function AvatarCameraButton() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await nestUploadFile("courier-avatars", file);
      await nestUpdateMyCourier({ avatar_url: uploaded.path });
    },
    onSuccess: () => {
      toast.success("התמונה עודכנה");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      qc.invalidateQueries({ queryKey: ["courier-avatar-signed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={upload.isPending}
        className="absolute bottom-0 right-0 z-10 size-8 bg-white rounded-full flex items-center justify-center border-2 border-slate-800 disabled:opacity-60"
        aria-label="עריכת תמונת פרופיל"
      >
        <Camera className="size-4 text-slate-700" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function PersonalInlineEditor({ me, onDone }: { me: CourierSelfRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(me.full_name ?? "");
  const [email, setEmail] = useState(me.email ?? "");
  const [idNumber, setIdNumber] = useState(me.id_number ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const name = fullName.trim();
      if (name.length < 2) throw new Error("יש למלא שם מלא");
      await nestUpdateMyCourier({
        full_name: name,
        email: email.trim() || null,
        id_number: idNumber.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("הפרטים נשמרו");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <Label className={fieldLabel()}>שם מלא</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="min-h-11 text-end" />
      </div>
      <div>
        <Label className={fieldLabel()}>טלפון וואטסאפ</Label>
        <Input value={me.whatsapp_phone ?? ""} disabled className="min-h-11 text-end" dir="ltr" />
        <p className="mt-1 text-end text-[11px] text-amber-700">שינוי מספר דורש פנייה לתמיכה</p>
      </div>
      <div>
        <Label className={fieldLabel()}>אימייל</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 text-end" dir="ltr" />
      </div>
      <div>
        <Label className={fieldLabel()}>תעודת זהות</Label>
        <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="min-h-11 text-end" dir="ltr" inputMode="numeric" />
      </div>
      <SaveButton pending={save.isPending} />
    </form>
  );
}

export function VehicleInlineEditor({ me, onDone }: { me: CourierSelfRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [vehicle, setVehicle] = useState(me.vehicle_type ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(me.vehicle_plate ?? "");

  const save = useMutation({
    mutationFn: async () => {
      await nestUpdateMyCourier({
        vehicle_type: vehicle.trim() || null,
        vehicle_plate: vehiclePlate.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("פרטי הרכב נשמרו");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <Label className={fieldLabel()}>כלי עבודה</Label>
        <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="min-h-11 text-end" placeholder="קטנוע / רכב / אופניים חשמליים" />
      </div>
      <div>
        <Label className={fieldLabel()}>מספר רישוי</Label>
        <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} className="min-h-11 text-end" dir="ltr" />
      </div>
      <SaveButton pending={save.isPending} />
    </form>
  );
}

export function OsekInlineEditor({ me, onDone }: { me: CourierSelfRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [businessType, setBusinessType] = useState(me.business_type ?? "");
  const [taxId, setTaxId] = useState(me.tax_id ?? "");
  const [invoiceName, setInvoiceName] = useState(me.invoice_name ?? "");

  const save = useMutation({
    mutationFn: async () => {
      await nestUpdateMyCourier({
        business_type: businessType || null,
        tax_id: taxId.trim() || null,
        invoice_name: invoiceName.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("פרטי העוסק נשמרו");
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <Label className={fieldLabel()}>סוג עוסק</Label>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-end"
        >
          <option value="">לא נבחר</option>
          <option value="עוסק פטור">עוסק פטור</option>
          <option value="עוסק מורשה">עוסק מורשה</option>
        </select>
      </div>
      <div>
        <Label className={fieldLabel()}>מספר עוסק / ח.פ.</Label>
        <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="min-h-11 text-end" dir="ltr" />
      </div>
      <div>
        <Label className={fieldLabel()}>שם לחשבונית</Label>
        <Input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} className="min-h-11 text-end" />
      </div>
      <SaveButton pending={save.isPending} />
    </form>
  );
}

export function DocumentsInlineEditor({ courierId, onDone }: { courierId?: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [idFile, setIdFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docExpiry, setDocExpiry] = useState<Record<string, string>>({});

  const { data: documents = [] } = useQuery({
    queryKey: ["my-courier-documents", courierId],
    enabled: !!courierId,
    queryFn: nestListMyCourierDocuments,
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const meta of COURIER_DOCUMENT_TYPES) {
      const row = documents.find((doc) => doc.type === meta.type);
      const raw = row?.expires_at ? String(row.expires_at) : "";
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      next[meta.type] = match?.[1] ?? "";
    }
    setDocExpiry(next);
  }, [documents]);

  const save = useMutation({
    mutationFn: async () => {
      if (idFile) {
        const uploaded = await nestUploadFile("courier-ids", idFile);
        await nestUpdateMyCourier({ id_photo_url: uploaded.path });
      }
      for (const meta of COURIER_DOCUMENT_TYPES) {
        const file = docFiles[meta.type];
        const expiry = (docExpiry[meta.type] ?? "").trim();
        const existing = documents.find((doc) => doc.type === meta.type);
        const existingExpiry = String(existing?.expires_at ?? "").slice(0, 10);
        const expiryChanged = expiry !== (existingExpiry.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "");
        if (!file && !expiryChanged) continue;
        const body: { file_url?: string | null; expires_at?: string | null } = {};
        if (file) {
          const uploaded = await nestUploadFile("courier-documents", file);
          body.file_url = uploaded.path;
        }
        if (expiryChanged) body.expires_at = expiry || null;
        await nestUpdateMyCourierDocument(meta.type, body);
      }
    },
    onSuccess: () => {
      toast.success("המסמכים עודכנו");
      setIdFile(null);
      setDocFiles({});
      qc.invalidateQueries({ queryKey: ["my-courier-me"] });
      qc.invalidateQueries({ queryKey: ["my-courier-documents"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <Label className={fieldLabel()}>תעודת זהות</Label>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 text-sm">
          <Camera className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{idFile?.name ?? "העלה תמונה / PDF"}</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {COURIER_DOCUMENT_TYPES.map((meta) => {
        const existing = documents.find((doc) => doc.type === meta.type);
        return (
          <div key={meta.type} className="space-y-2 rounded-xl border border-slate-100 p-3">
            <Label className="block text-end text-sm font-bold">{meta.label}</Label>
            <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 text-sm">
              <Camera className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                {docFiles[meta.type]?.name ?? (existing?.file_url ? "קובץ קיים — ניתן להחליף" : "העלה תמונה / PDF")}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setDocFiles((prev) => ({ ...prev, [meta.type]: e.target.files?.[0] ?? null }))}
              />
            </label>
            <div>
              <Label className={fieldLabel()}>תוקף</Label>
              <Input
                type="date"
                value={docExpiry[meta.type] ?? ""}
                onChange={(e) => setDocExpiry((prev) => ({ ...prev, [meta.type]: e.target.value }))}
                className="min-h-11 text-end"
                dir="ltr"
              />
            </div>
          </div>
        );
      })}
      <SaveButton pending={save.isPending} label="שמור מסמכים" />
    </form>
  );
}
