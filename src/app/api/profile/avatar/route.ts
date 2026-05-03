import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { detectSafeImage } from "@/lib/imageUpload";
import { createServiceSupabase } from "@/lib/supabase/service";

const MAX_BYTES = 3 * 1024 * 1024;
const BUCKET = "avatars";

export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) return jsonError("Choose a profile photo to upload.", 400);
    if (file.size > MAX_BYTES) return jsonError("Image must be 3 MB or smaller.", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = detectSafeImage(buffer);
    if (!image) return jsonError("Please upload a JPG, PNG, or WEBP image.", 400);

    const path = `avatars/${me.id}-${Date.now()}.${image.extension}`;
    const service = createServiceSupabase();

    const { error } = await service.storage.from(BUCKET).upload(path, buffer, {
      contentType: image.contentType,
      upsert: true,
    });

    if (error) {
      const message = error.message ?? "";
      if (/bucket not found/i.test(message)) {
        return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 400);
      }
      return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 400);
    }

    const { data } = service.storage.from(BUCKET).getPublicUrl(path);
    if (!data.publicUrl) return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 500);

    return jsonOk({ url: data.publicUrl, path });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 503);
    }
    return handleRouteError(e);
  }
}
