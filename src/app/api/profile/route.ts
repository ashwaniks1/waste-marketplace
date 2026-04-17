import { z } from "zod";
import { getSupabaseUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/service";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

const baseProfileSelect = "id, name, email, phone, address, role";
const profileSelect = `${baseProfileSelect}, avatar_url`;

type BaseProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: "customer" | "buyer" | "driver" | "admin";
};

type ProfileRow = BaseProfileRow & {
  avatar_url: string | null;
};

function serializeProfile(row: BaseProfileRow | ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    avatarUrl: "avatar_url" in row ? row.avatar_url : null,
    role: row.role,
  };
}

function isMissingAvatarColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  return maybe.code === "PGRST204" && maybe.message?.includes("avatar_url") === true;
}

async function selectProfile(
  supabase: ReturnType<typeof createServiceSupabase>,
  userId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase table not in generated types
  const usersTable = supabase.from("users") as any;
  const full = await usersTable.select(profileSelect).eq("id", userId).single();
  if (!full.error) {
    return { data: full.data as ProfileRow, avatarColumnAvailable: true };
  }
  if (!isMissingAvatarColumnError(full.error)) return { error: full.error };

  const fallback = await usersTable.select(baseProfileSelect).eq("id", userId).single();
  if (fallback.error) return { error: fallback.error };

  return { data: fallback.data as BaseProfileRow, avatarColumnAvailable: false };
}

export async function GET() {
  try {
    const authUser = await getSupabaseUser();
    if (!authUser) return jsonError("Unauthorized", 401);
    const supabase = createServiceSupabase();
    const result = await selectProfile(supabase, authUser.id);
    if (result.error) throw result.error;
    if (!result.data) return jsonError("Profile not available", 404);

    const reviewSummary = await prisma.review.aggregate({
      _avg: { score: true },
      _count: { score: true },
      where: { toUserId: result.data.id },
    });

    return jsonOk({
      profile: serializeProfile(result.data),
      avatarColumnAvailable: result.avatarColumnAvailable,
      reviewSummary: {
        averageRating: reviewSummary._avg.score ?? null,
        reviewCount: reviewSummary._count.score,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("Profile updates are not configured", 503);
    }
    return handleRouteError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getSupabaseUser();
    if (!authUser) return jsonError("Unauthorized", 401);

    const body = updateProfileSchema.parse(await request.json());

    const supabase = createServiceSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase table not in generated types
    const usersTable = supabase.from("users") as any;
    const updateData: Record<string, string | null> = {
      name: body.name,
      phone: body.phone ?? null,
      address: body.address ?? null,
    };
    if (body.avatarUrl !== undefined) {
      updateData.avatar_url = body.avatarUrl ?? null;
    }

    let avatarColumnAvailable = true;
    let { data, error } = await usersTable
      .update(updateData)
      .eq("id", authUser.id)
      .select(profileSelect)
      .single();

    if (error && isMissingAvatarColumnError(error)) {
      avatarColumnAvailable = false;
      delete updateData.avatar_url;
      const fallback = await usersTable
        .update(updateData)
        .eq("id", authUser.id)
        .select(baseProfileSelect)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return jsonOk({
      profile: serializeProfile(data as BaseProfileRow | ProfileRow),
      avatarColumnAvailable,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("Profile updates are not configured", 503);
    }
    return handleRouteError(e);
  }
}
