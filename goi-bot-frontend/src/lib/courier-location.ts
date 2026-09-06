import { nestUpdateMyCourier } from "@/lib/nest-accounts";

export const COURIER_GPS_REQUIRED_MESSAGE =
  "יש לאשר מיקום (GPS) כדי להיות זמין. בלי מיקום אי אפשר לתעדף משלוחים לידך.";

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

export async function goCourierOnlineWithGps() {
  const { lat, lng } = await requestCourierGpsFix();
  await nestUpdateMyCourier({
    last_lat: lat,
    last_lng: lng,
    location_sharing_enabled: true,
    accepting_jobs: true,
  });
}
