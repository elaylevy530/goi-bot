export type DeliveryProofSettings = {
  name: boolean;
  photo: boolean;
  signature: boolean;
  done: boolean;
};

export type CourierDeliveryProof = {
  recipient_name?: string;
  photo_path?: string;
  signature_path?: string;
};

export const DELIVERY_PROOF_LABELS: Record<keyof DeliveryProofSettings, string> = {
  name: "שם המקבל",
  photo: "תמונה",
  signature: "חתימה",
  done: "לחיצה על נמסר",
};

export function normalizeDeliveryProof(raw: unknown): DeliveryProofSettings {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    name: p.name === true,
    photo: p.photo === true,
    signature: p.signature === true,
    done: true,
  };
}

export function deliveryProofNeedsCapture(settings: DeliveryProofSettings) {
  return settings.name || settings.photo || settings.signature;
}

export function deliveryProofRequirementList(settings: DeliveryProofSettings) {
  const items: Array<{ key: keyof DeliveryProofSettings; label: string }> = [
    { key: "done", label: DELIVERY_PROOF_LABELS.done },
  ];
  if (settings.name) items.push({ key: "name", label: DELIVERY_PROOF_LABELS.name });
  if (settings.photo) items.push({ key: "photo", label: DELIVERY_PROOF_LABELS.photo });
  if (settings.signature) items.push({ key: "signature", label: DELIVERY_PROOF_LABELS.signature });
  return items;
}
