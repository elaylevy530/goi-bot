import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courierIsNearbyOrMatching, pickDispatchCouriers } from "./courier-job-match";

describe("courierIsNearbyOrMatching", () => {
  const job = {
    pickup_area: "חדרה",
    pickup_address: "הרצל 1, חדרה",
    pickup_lat: 32.43,
    pickup_lng: 34.92,
  };

  it("matches a courier by marked city without GPS", () => {
    assert.equal(
      courierIsNearbyOrMatching(job, {
        working_areas: ["השרון", "חדרה"],
        location_sharing_enabled: false,
      }),
      true,
    );
  });

  it("matches a nearby GPS courier even if the city is not selected", () => {
    assert.equal(
      courierIsNearbyOrMatching(job, {
        working_areas: ["תל אביב"],
        location_sharing_enabled: true,
        last_lat: 32.43,
        last_lng: 34.92,
        work_distance_from_base: "15 ק״מ",
      }),
      true,
    );
  });

  it("does not match a far GPS courier whose cities miss the pickup", () => {
    assert.equal(
      courierIsNearbyOrMatching(job, {
        working_areas: ["אילת"],
        location_sharing_enabled: true,
        last_lat: 29.55,
        last_lng: 34.95,
        work_distance_from_base: "15 ק״מ",
      }),
      false,
    );
  });
});

describe("pickDispatchCouriers", () => {
  it("keeps both GPS-nearby and city-matched couriers", () => {
    const job = {
      pickup_area: "חדרה",
      pickup_address: "חדרה",
      pickup_lat: 32.43,
      pickup_lng: 34.92,
      vehicle_required: "רכב",
    };
    const gps = {
      vehicle_type: "רכב",
      location_sharing_enabled: true,
      last_lat: 32.43,
      last_lng: 34.92,
      work_distance_from_base: "15 ק״מ",
      working_areas: ["תל אביב"],
    };
    const city = {
      vehicle_type: "רכב",
      location_sharing_enabled: false,
      working_areas: ["חדרה"],
    };
    const far = {
      vehicle_type: "רכב",
      location_sharing_enabled: false,
      working_areas: ["אילת"],
    };
    const picked = pickDispatchCouriers(job, [gps, city, far]);
    assert.equal(picked.includes(gps), true);
    assert.equal(picked.includes(city), true);
    assert.equal(picked.includes(far), false);
  });
});
