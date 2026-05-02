import { z } from "zod";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { rateLimitCombinedResponse } from "@/lib/rateLimitHttp";

const bodySchema = z.object({
  address: z.string().trim().min(3, "Address is too short"),
});

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
      return jsonError("Geocoding is not configured on the server", 503);
    }

    const body = bodySchema.parse(await request.json());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(body.address)}&key=${key}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } } }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.[0]) {
      return jsonError(data.error_message ?? "Could not geocode address", 400);
    }

    const loc = data.results[0].geometry.location;
    return jsonOk({ latitude: loc.lat, longitude: loc.lng });
  } catch (e) {
    return handleRouteError(e);
  }
}
