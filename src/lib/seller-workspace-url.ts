import type { ReadonlyURLSearchParams } from "next/navigation";

/**
 * When a seller has an active chat (`?c=conversationId`), all listing deep-links must
 * preserve it so the floating inbox does not reset while switching records (see UX:
 * state continuity, minimal surprise).
 */
export function customerListingDetailHref(
  listingId: string,
  searchParams: ReadonlyURLSearchParams | null | undefined,
): string {
  const c = searchParams?.get("c");
  if (c) {
    return `/customer/listings/${listingId}?c=${encodeURIComponent(c)}`;
  }
  return `/customer/listings/${listingId}`;
}
