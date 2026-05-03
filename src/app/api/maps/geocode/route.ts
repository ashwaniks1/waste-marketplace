import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const bodySchema = z.object({
  address: z.string().trim().min(3, "Address is too short"),
  label: z.string().trim().max(120).optional(),
});

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function pickComponent(components: GoogleAddressComponent[], type: string, key: "long_name" | "short_name" = "long_name") {
  return components.find((component) => component.types.includes(type))?.[key] ?? null;
}

function toLocationObject(result: {
  formatted_address?: string;
  place_id?: string;
  address_components?: GoogleAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
}, label?: string) {
  const components = result.address_components ?? [];
  const streetNumber = pickComponent(components, "street_number");
  const route = pickComponent(components, "route");
  const city =
    pickComponent(components, "locality") ||
    pickComponent(components, "postal_town") ||
    pickComponent(components, "administrative_area_level_2") ||
    "";
  const state = pickComponent(components, "administrative_area_level_1", "short_name");
  const country = pickComponent(components, "country", "short_name") || "";
  return {
    label: label ?? null,
    street: [streetNumber, route].filter(Boolean).join(" ") || null,
    city,
    state,
    postalCode: pickComponent(components, "postal_code"),
    country,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    timezone: null,
    formattedAddress: result.formatted_address ?? null,
    source: "geocoder",
    providerPlaceId: result.place_id ?? null,
  };
}

/**
 * Server-side geocode (Google). Set GOOGLE_MAPS_SERVER_KEY in .env (restrict by IP in Google Cloud).
 * Returns { lat, lng } or 503 if not configured.
 */
export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    const limited = rateLimitCombinedResponse(request, "maps-geocode", 20, 60_000, me.id);
    if (limited) return limited;

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      return jsonError("We couldn’t place this address on the map right now.", 503);
    }

    const body = bodySchema.parse(await request.json());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(body.address)}&key=${key}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      results?: {
        formatted_address?: string;
        place_id?: string;
        address_components?: GoogleAddressComponent[];
        geometry: { location: { lat: number; lng: number } };
      }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.[0]) {
      return jsonError("We couldn’t place this address on the map. Check the address or set the pin manually.", 400);
    }

    const location = toLocationObject(data.results[0], body.label);
    return jsonOk({ latitude: location.latitude, longitude: location.longitude, location });
  } catch (e) {
    return handleRouteError(e);
  }
}
