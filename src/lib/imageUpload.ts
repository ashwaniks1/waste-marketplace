export type SafeImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function hasBytes(buf: Buffer, offset: number, bytes: number[]) {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buf[offset + index] === byte);
}

export function detectSafeImage(buf: Buffer): SafeImage | null {
  if (buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (hasBytes(buf, 0, PNG_SIGNATURE)) {
    return { contentType: "image/png", extension: "png" };
  }

  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}
