import { nestUpdateMyCourier } from "@/lib/nest-accounts";

export const COURIER_GPS_REQUIRED_MESSAGE =
  "לא הצלחנו לקבל מיקום כרגע. אפשר להמשיך לפי האזורים והערים שבחרת, או להפעיל מיקום בהגדרות המכשיר.";

export type DeviceLocationPermission = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export type GpsFixSnapshot = {
  permission?: DeviceLocationPermission | string | null;
  error?: string | null;
  lastFixAt?: number | null;
};

export function isLiveGpsFix(gps: GpsFixSnapshot | null | undefined): boolean {
  return gps?.permission === "granted" && !gps.error && gps.lastFixAt != null;
}

export async function readDeviceLocationPermission(): Promise<DeviceLocationPermission> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    const permissions = navigator.permissions;
    if (!permissions?.query) return "unknown";
    const status = await permissions.query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
  } catch {
    // Safari and some WebViews throw or omit geolocation from Permissions API.
  }
  return "unknown";
}

/** True when the device already has a usable GPS signal — no need to ask. */
export function isLocationActiveFromSignals(input: {
  liveFix: boolean;
  permission: DeviceLocationPermission;
  sharingEnabled: boolean;
}): boolean {
  if (input.liveFix || input.permission === "granted") return true;
  if (input.permission === "unknown") return input.sharingEnabled;
  return false;
}

export async function isDeviceLocationActive(opts?: {
  gps?: GpsFixSnapshot | null;
  sharingEnabled?: boolean | null;
}): Promise<boolean> {
  const liveFix = isLiveGpsFix(opts?.gps);
  if (liveFix) return true;
  const permission = await readDeviceLocationPermission();
  return isLocationActiveFromSignals({
    liveFix,
    permission,
    sharingEnabled: opts?.sharingEnabled === true,
  });
}

function readGpsPosition(options: PositionOptions) {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options,
    );
  });
}

export function isGpsPermissionDenied(err: unknown) {
  const code = err && typeof err === "object" && "code" in err ? Number((err as { code: unknown }).code) : NaN;
  return code === 1;
}

export async function requestCourierGpsFix(): Promise<{ lat: number; lng: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("הדפדפן לא תומך במיקום");
  }
  try {
    return await readGpsPosition({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 });
  } catch (err) {
    if (isGpsPermissionDenied(err)) {
      throw new Error(COURIER_GPS_REQUIRED_MESSAGE);
    }
    try {
      return await readGpsPosition({ enableHighAccuracy: false, timeout: 8_000, maximumAge: 120_000 });
    } catch (retryErr) {
      if (isGpsPermissionDenied(retryErr)) {
        throw new Error(COURIER_GPS_REQUIRED_MESSAGE);
      }
      throw new Error("לא הצלחנו לזהות מיקום. נסה שוב עם GPS דולק");
    }
  }
}

/** Go available without requiring GPS. Nearby matching stays on when location sharing is already enabled. */
export async function goCourierOnline() {
  await nestUpdateMyCourier({ accepting_jobs: true });
}

export async function goCourierOnlineWithGps() {
  return goCourierOnline();
}

export async function enableCourierLocationSharing() {
  let coords: { lat: number; lng: number } | null = null;
  try {
    coords = await requestCourierGpsFix();
  } catch (err) {
    if (err instanceof Error && err.message === COURIER_GPS_REQUIRED_MESSAGE) {
      throw new Error(
        "הדפדפן חסם מיקום. היכנסו להגדרות המכשיר, אפשרו מיקום ל־Goi, ואז לחצו שוב «הדליקו מיקום».",
      );
    }
  }
  await nestUpdateMyCourier({
    location_sharing_enabled: true,
    ...(coords ? { last_lat: coords.lat, last_lng: coords.lng } : {}),
  });
  return { hasFix: !!coords };
}
