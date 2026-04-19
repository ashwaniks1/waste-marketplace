import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { ProfileVisitClient } from "@/components/ProfileVisitClient";
import { ListingStatus, UserRole, type User } from "@prisma/client";
import { createServiceSupabase } from "@/lib/supabase/service";
import { namesFromAuthMetadata } from "@/lib/userProfileFromAuth";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  if (!userId) {
    notFound();
  }

  const auth = await getSupabaseUser();
  if (!auth) redirect("/login");

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      avatarUrl: true,
    },
  });

  // Some older accounts can exist in Supabase Auth but be missing from the Prisma mirror table.
  // Repair on-demand so profile links from listings/chat always resolve.
  if (!user) {
    try {
      const service = createServiceSupabase();
      const { data, error } = await service.auth.admin.getUserById(userId);
      if (error || !data.user) notFound();

      const meta = data.user.user_metadata as Record<string, unknown> | null | undefined;
      const nameFromMeta = typeof meta?.name === "string" ? meta.name.trim() : "";
      const email = data.user.email?.trim() ?? "";
      const emailLocal = email.split("@")[0] || "User";
      const { firstName, lastName, displayName } = namesFromAuthMetadata(meta, nameFromMeta, emailLocal);

      const roleFromMeta = getRoleFromSupabaseUser(data.user);
      const role = (roleFromMeta ?? UserRole.customer) as UserRole;

      user = await prisma.user.create({
        data: {
          id: data.user.id,
          email,
          name: displayName,
          firstName,
          lastName,
          role,
          phone: typeof meta?.phone === "string" ? meta.phone.trim() || null : null,
          address: typeof meta?.address === "string" ? meta.address.trim() || null : null,
          vehicleType: typeof meta?.vehicleType === "string" ? meta.vehicleType.trim() || null : null,
          licenseNumber: typeof meta?.licenseNumber === "string" ? meta.licenseNumber.trim() || null : null,
          availability: typeof meta?.availability === "string" ? meta.availability.trim() || null : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          avatarUrl: true,
        },
      });
    } catch {
      notFound();
    }
  }

  const reviewSummary = await prisma.review.aggregate({
    _avg: { score: true },
    _count: { score: true },
    where: { toUserId: userId },
  });

  const reviewsRaw = await prisma.review.findMany({
    where: { toUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  const reviews = reviewsRaw.map((review) => ({
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }));

  const openListingsRaw = await prisma.wasteListing.findMany({
    where: { userId, status: ListingStatus.open },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      wasteType: true,
      quantity: true,
      address: true,
      askingPrice: true,
      currency: true,
      deliveryAvailable: true,
    },
    take: 3,
  });
  const openListings = openListingsRaw.map((listing) => ({
    ...listing,
    askingPrice: Number(listing.askingPrice),
  }));

  const viewer = await getAppUser();
  const viewerRole = viewer?.role ?? null;

  if (viewer?.id === userId) {
    redirect("/profile");
  }

  const profileRestricted = Boolean(
    viewer?.role === UserRole.driver &&
      viewer.id !== userId &&
      (await prisma.driverProfileBlock.findUnique({
        where: { driverId_blockedUserId: { driverId: viewer.id, blockedUserId: userId } },
      })),
  );

  const publicProfile: Pick<User, "id" | "name" | "role" | "avatarUrl"> & {
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } = {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    email: null,
    phone: null,
    address: profileRestricted ? null : user.address,
  };

  const reviewSummaryPayload = profileRestricted
    ? { averageRating: null as number | null, reviewCount: 0 }
    : { averageRating: reviewSummary._avg.score ?? null, reviewCount: reviewSummary._count.score };

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8">
      <ProfileVisitClient
        profile={publicProfile}
        reviewSummary={reviewSummaryPayload}
        reviews={profileRestricted ? [] : reviews}
        openListings={openListings}
        viewerId={viewer?.id ?? null}
        viewerRole={viewerRole}
        profileRestricted={profileRestricted}
      />
    </main>
  );
}
