import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

const geocodeInput = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const reverseGeocode = createServerFn({ method: "POST" })
  .validator((d: unknown) => geocodeInput.parse(d))
  .handler(async ({ data }) => {
    const { lat, lng } = data;
    const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "HerSpace/1.0" },
    });
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const json = (await res.json()) as any;
    const address = json.address || {};
    return {
      city:
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.municipality ||
        null,
      country: address.country || null,
      countryCode: address.country_code || null,
    };
  });
