import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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
  geometry?: { location?: { lat: number; lng: number } };
}, fallback: { latitude: number; longitude: number; label?: string }) {
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
    label: fallback.label ?? null,
    street: [streetNumber, route].filter(Boolean).join(" ") || null,
    city,
    state,
    postalCode: pickComponent(components, "postal_code"),
    country,
    latitude: result.geometry?.location?.lat ?? fallback.latitude,
    longitude: result.geometry?.location?.lng ?? fallback.longitude,
    timezone: null,
    formattedAddress: result.formatted_address ?? null,
    source: "geocoder",
    providerPlaceId: result.place_id ?? null,
  };
}

/**
 * Google reverse geocode. Returns a formatted address for map pin / "use my location."
 */
export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    const limited = rateLimitCombinedResponse(request, "maps-reverse-geocode", 20, 60_000, me.id);
    if (limited) return limited;

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      return jsonError("We couldn’t use your location for the map right now.", 503);
    }

    const { latitude, longitude, label } = bodySchema.parse(await request.json());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
      `${latitude},${longitude}`,
    )}&key=${key}`;

    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      results?: {
        formatted_address?: string;
        place_id?: string;
        address_components?: GoogleAddressComponent[];
        geometry?: { location?: { lat: number; lng: number } };
      }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.[0]) {
      return jsonError("We couldn’t use this location for the map. Set the address manually instead.", 400);
    }

    const location = toLocationObject(data.results[0], { latitude, longitude, label });
    return jsonOk({ formattedAddress: location.formattedAddress, location });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/maps/reverse-geocode" });
  }
}
