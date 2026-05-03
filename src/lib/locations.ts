import { LocationSource, Prisma, VisibilityScope } from "@prisma/client";
import { z } from "zod";

const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export const visibilityScopeSchema = z.nativeEnum(VisibilityScope).default(VisibilityScope.local);

export const locationInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(120).optional().nullable(),
  street: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().max(32).optional().nullable(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geohash: z.string().trim().min(1).max(16).optional().nullable(),
  timezone: z.string().trim().max(120).optional().nullable(),
  formattedAddress: z.string().trim().max(500).optional().nullable(),
  source: z.nativeEnum(LocationSource).optional().default(LocationSource.manual),
  providerPlaceId: z.string().trim().max(200).optional().nullable(),
  rawProviderPayload: z.unknown().optional(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;

export const geoLocationSelect = {
  id: true,
  label: true,
  street: true,
  city: true,
  state: true,
  postalCode: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  geohash: true,
  timezone: true,
  formattedAddress: true,
} satisfies Prisma.GeoLocationSelect;

export type SerializableGeoLocation = Prisma.GeoLocationGetPayload<{
  select: typeof geoLocationSelect;
}>;

export function encodeGeohash(latitude: number, longitude: number, precision = 12): string {
  let even = true;
  let bit = 0;
  let ch = 0;
  let geohash = "";
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];

  while (geohash.length < precision) {
    if (even) {
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (longitude >= mid) {
        ch = (ch << 1) + 1;
        lngRange = [mid, lngRange[1]];
      } else {
        ch <<= 1;
        lngRange = [lngRange[0], mid];
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (latitude >= mid) {
        ch = (ch << 1) + 1;
        latRange = [mid, latRange[1]];
      } else {
        ch <<= 1;
        latRange = [latRange[0], mid];
      }
    }

    even = !even;
    if (++bit === 5) {
      geohash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

export function serializeGeoLocation(location: SerializableGeoLocation | null | undefined) {
  if (!location) return null;
  return {
    id: location.id,
    label: location.label,
    street: location.street,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    country: location.countryCode,
    latitude: location.latitude,
    longitude: location.longitude,
    geohash: location.geohash,
    timezone: location.timezone,
    formattedAddress: location.formattedAddress,
  };
}

export function toGeoLocationCreateInput(
  input: LocationInput,
  createdById: string,
): Prisma.GeoLocationCreateInput {
  return {
    createdBy: { connect: { id: createdById } },
    label: input.label?.trim() || null,
    street: input.street?.trim() || null,
    city: input.city.trim(),
    state: input.state?.trim() || null,
    postalCode: input.postalCode?.trim() || null,
    countryCode: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    geohash: input.geohash?.trim() || encodeGeohash(input.latitude, input.longitude),
    timezone: input.timezone?.trim() || null,
    formattedAddress: input.formattedAddress?.trim() || null,
    source: input.source,
    providerPlaceId: input.providerPlaceId?.trim() || null,
    rawProviderPayload:
      input.rawProviderPayload === undefined ? Prisma.JsonNull : (input.rawProviderPayload as Prisma.InputJsonValue),
  };
}

export function locationToLegacyAddress(input: LocationInput): string {
  return (
    input.formattedAddress?.trim() ||
    [input.street, input.city, input.state, input.postalCode, input.country]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ")
  );
}
