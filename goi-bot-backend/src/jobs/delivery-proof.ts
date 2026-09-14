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

export function proofFromNicheDetails(niche: Record<string, unknown> | null | undefined) {
  const proof = niche?.proof;
  return normalizeDeliveryProof(proof);
}
