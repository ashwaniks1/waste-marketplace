import type { User } from "@prisma/client";
import { serializeGeoLocation, type SerializableGeoLocation } from "@/lib/locations";

export function profileToClientDto(u: User & { primaryLocation?: SerializableGeoLocation | null }) {
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    email: u.email,
    phone: u.phone,
    address: u.address,
    avatarUrl: u.avatarUrl,
    role: u.role,
    zipCode: u.zipCode,
    countryCode: u.countryCode,
    currency: u.currency,
    primaryLocation: serializeGeoLocation(u.primaryLocation),
  };
}
