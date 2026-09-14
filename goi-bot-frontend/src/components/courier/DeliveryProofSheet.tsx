import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Pencil, User } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { nestUploadFile } from "@/lib/nest-files";
import {
  type CourierDeliveryProof,
  type DeliveryProofSettings,
  DELIVERY_PROOF_LABELS,
} from "@/lib/delivery-proof";

type Props = {
  open: boolean;
  settings: DeliveryProofSettings;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (proof: CourierDeliveryProof) => void | Promise<void>;
};

export function DeliveryProofSheet({
  open,
  settings,
  submitting = false,
  onOpenChange,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhoto(null);
    setSignature(null);
    setError(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!photo) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const close = () => {
    if (busy || submitting) return;
    onOpenChange(false);
  };

  const confirm = async () => {
    setError(null);
    if (settings.name && !name.trim()) {
      setError("יש לרשום את שם המקבל");
      return;
    }
    if (settings.photo && !photo) {
      setError("יש לצלם תמונת מסירה");
      return;
    }
    if (settings.signature && !signature) {
      setError("יש לקחת חתימה");
      return;
    }
    setBusy(true);
    try {
      const payload: CourierDeliveryProof = {};
      if (settings.name) payload.recipient_name = name.trim();
      if (photo) {
        const uploaded = await nestUploadFile("delivery-proofs", photo);
        payload.photo_path = uploaded.path;
      }
      if (signature) {
        const uploaded = await nestUploadFile("delivery-proofs", signature);
        payload.signature_path = uploaded.path;
      }
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "לא הצלחנו לשמור את אישור המסירה");
    } finally {
      setBusy(false);
    }
  };

  const pending = busy || submitting;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] border-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 [&>button]:left-4 [&>button]:right-auto"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" aria-hidden />
        <SheetTitle className="text-right text-[1.2rem] font-extrabold text-text-strong">
          אישור מסירה
        </SheetTitle>
        <SheetDescription className="mt-1 text-right text-[13px] leading-relaxed text-text-muted">
          העסק ביקש לאשר את המסירה לפני סימון נמסר.
        </SheetDescription>

        <div className="mt-4 space-y-4">
          {settings.name && (
            <label className="block text-right">
              <span className="mb-1.5 flex items-center justify-end gap-1.5 text-[13px] font-extrabold text-text-strong">
                {DELIVERY_PROOF_LABELS.name}
                <User className="size-4 text-primary" aria-hidden />
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם האדם שקיבל"
                autoComplete="name"
                className="min-h-12 w-full rounded-card border border-border bg-surface px-3 text-right text-[15px] font-semibold text-text-strong outline-none focus:border-primary"
              />
            </label>
          )}

          {settings.photo && (
            <div className="text-right">
              <p className="mb-1.5 flex items-center justify-end gap-1.5 text-[13px] font-extrabold text-text-strong">
                {DELIVERY_PROOF_LABELS.photo}
                <Camera className="size-4 text-primary" aria-hidden />
              </p>
              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-3 text-[13px] font-bold text-text-strong">
                <Camera className="size-4 text-primary" />
                {photo ? "החליפו תמונה" : "צלמו או בחרו תמונה"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="תצוגה מקדימה של תמונת המסירה"
                  className="mt-2 max-h-40 w-full rounded-card object-cover"
                />
              )}
            </div>
          )}

          {settings.signature && (
            <div className="text-right">
              <p className="mb-1.5 flex items-center justify-end gap-1.5 text-[13px] font-extrabold text-text-strong">
                {DELIVERY_PROOF_LABELS.signature}
                <Pencil className="size-4 text-primary" aria-hidden />
              </p>
              <SignaturePad disabled={pending} onChange={setSignature} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-right text-[13px] font-semibold text-danger-text">{error}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-full font-extrabold"
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {pending ? "שומרים…" : "אשרו מסירה"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-full font-bold"
            disabled={pending}
            onClick={close}
          >
            ביטול
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SignaturePad({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 160;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#16382c";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    empty.current = true;
    onChangeRef.current(null);
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas || empty.current) {
      onChange(null);
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        onChange(null);
        return;
      }
      onChange(new File([blob], "signature.png", { type: "image/png" }));
    }, "image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    empty.current = true;
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        dir="ltr"
        className="h-40 w-full touch-none rounded-card border border-border bg-white"
        onPointerDown={(e) => {
          if (disabled) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          drawing.current = true;
          canvasRef.current?.setPointerCapture(e.pointerId);
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || disabled) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const p = point(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          empty.current = false;
        }}
        onPointerUp={() => {
          drawing.current = false;
          emit();
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <button
        type="button"
        className="mt-2 text-[12px] font-bold text-text-muted"
        disabled={disabled}
        onClick={clear}
      >
        נקו חתימה
      </button>
    </div>
  );
}
