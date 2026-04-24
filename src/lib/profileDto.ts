import type { User } from "@prisma/client";

export function profileToClientDto(u: User) {
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
  };
}
