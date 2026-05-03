import { requireAppUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { detectSafeImage } from "@/lib/imageUpload";
import { createServiceSupabase } from "@/lib/supabase/service";

const MAX_BYTES = 5 * 1024 * 1024;

function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "listing-images";
}

/**
 * Uploads one image to Supabase Storage (public bucket). Server uses service role.
 * Form field name: `file`
 */
export async function POST(request: Request) {
  try {
    const me = await requireAppUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return jsonError("Choose a photo to upload.", 400);
    if (file.size > MAX_BYTES) return jsonError("Photo must be 5 MB or smaller.", 400);

    const buf = Buffer.from(await file.arrayBuffer());
    const image = detectSafeImage(buf);
    if (!image) return jsonError("Please upload a JPG, PNG, or WEBP image.", 400);

    const basename = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "listing";
    const path = `${me.id}/${Date.now()}-${basename}.${image.extension}`;

    const bucket = storageBucket();
    const service = createServiceSupabase();
    const { error } = await service.storage.from(bucket).upload(path, buf, {
      contentType: image.contentType,
      upsert: false,
    });
    if (error) {
      const msg = error.message ?? "";
      if (/bucket not found/i.test(msg)) {
        return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 400);
      }
      return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 400);
    }

    const { data: pub } = service.storage.from(bucket).getPublicUrl(path);
    return jsonOk({ url: pub.publicUrl, path });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonError("We couldn’t upload your photo right now. Try again in a moment.", 503);
    }
    return handleRouteError(e);
  }
}
