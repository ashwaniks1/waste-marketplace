import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppUser } from "@/lib/auth";
import { ProfileVisitClient } from "@/components/ProfileVisitClient";
import { ListingStatus } from "@prisma/client";

export default async function UserProfilePage({ params }: { params: { id?: string } }) {
  const userId = params?.id;
  if (!userId) {
    notFound();
  }

  const user = await prisma.user.findUnique({
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
  if (!user) notFound();

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
  }));

  const openListingsRaw = await prisma.wasteListing.findMany({
    where: { userId: params.id, status: ListingStatus.open },
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

  if (viewer?.id === params.id) {
    redirect("/profile");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-8">
      <ProfileVisitClient
        profile={user}
        reviewSummary={{ averageRating: reviewSummary._avg.score ?? null, reviewCount: reviewSummary._count.score }}
        reviews={reviews}
        openListings={openListings}
        viewerId={viewer?.id ?? null}
        viewerRole={viewerRole}
      />
    </main>
  );
}
