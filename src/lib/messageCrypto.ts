import crypto from "node:crypto";

const PREFIX = "wmenc:v1";
const IV_BYTES = 12;

function getMessageKey() {
  const secret =
    process.env.MESSAGE_ENCRYPTION_KEY ??
    process.env.APP_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing MESSAGE_ENCRYPTION_KEY or APP_ENCRYPTION_KEY for chat encryption");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptMessageBody(plainText: string) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMessageKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptMessageBody(body: string) {
  if (!body.startsWith(`${PREFIX}:`)) return body;

  const [, , ivPart, tagPart, encryptedPart] = body.split(":");
  if (!ivPart || !tagPart || !encryptedPart) return "[Unable to decrypt message]";

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getMessageKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "[Unable to decrypt message]";
  }
}
