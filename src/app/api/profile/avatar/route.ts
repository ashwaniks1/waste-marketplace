import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/service";

const MAX_BYTES = 3 * 1024 * 1024;
const BUCKET = "avatars";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) return jsonError("Missing file", 400);
    if (file.size > MAX_BYTES) return jsonError("Image must be 3 MB or smaller.", 400);
    if (file.type && !allowedTypes.has(file.type)) {
      return jsonError("Please upload a JPG, PNG, or WEBP image.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `avatars/${me.id}-${Date.now()}.${extension}`;
    const service = createServiceSupabase();

    const { error } = await service.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      const message = error.message ?? "";
      if (/bucket not found/i.test(message)) {
        return jsonError(
          `Storage bucket "${BUCKET}" does not exist. Create it in Supabase Storage and make it public for avatar URLs.`,
          400,
        );
      }
      return jsonError(message || "Upload failed", 400);
    }

    const { data } = service.storage.from(BUCKET).getPublicUrl(path);
    if (!data.publicUrl) return jsonError("Could not get avatar URL", 500);

    return jsonOk({ url: data.publicUrl, path });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("Server storage is not configured", 503);
    }
    return handleRouteError(e);
  }
}
