import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Google reverse geocode. Returns a formatted address for map pin / "use my location."
 */
export async function POST(request: Request) {
  try {
    await requireAppUser();
    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      return jsonError("Geocoding is not configured on the server", 503);
    }

    const { latitude, longitude } = bodySchema.parse(await request.json());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
      `${latitude},${longitude}`,
    )}&key=${key}`;

    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      results?: { formatted_address: string }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.[0]) {
      return jsonError(data.error_message ?? "Could not resolve that location", 400);
    }

    return jsonOk({ formattedAddress: data.results[0].formatted_address });
  } catch (e) {
    return handleRouteError(e, { route: "POST /api/maps/reverse-geocode" });
  }
}
