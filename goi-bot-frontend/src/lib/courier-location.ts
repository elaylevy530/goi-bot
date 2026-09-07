import { nestUpdateMyCourier } from "@/lib/nest-accounts";

export const COURIER_GPS_REQUIRED_MESSAGE =
  "לא הצלחנו לקבל מיקום. אפשר להיות זמין גם בלי GPS — המשלוחים יגיעו לפי האזורים והערים שבחרת.";

export async function requestCourierGpsFix(): Promise<{ lat: number; lng: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("הדפדפן לא תומך במיקום");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error(COURIER_GPS_REQUIRED_MESSAGE));
          return;
        }
        reject(new Error("לא הצלחנו לזהות מיקום. נסה שוב עם GPS דולק"));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 20_000 },
    );
  });
}

/** Go available without requiring GPS. Nearby matching stays on when location sharing is already enabled. */
export async function goCourierOnline() {
  await nestUpdateMyCourier({ accepting_jobs: true });
}

export async function goCourierOnlineWithGps() {
  return goCourierOnline();
}
