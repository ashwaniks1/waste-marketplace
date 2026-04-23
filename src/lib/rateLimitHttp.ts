import { NextResponse } from "next/server";
import { takeToken } from "@/lib/rateLimit";

export function clientIpFromHeaders(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Combined IP + optional user id buckets (both must pass). */
export function rateLimitCombinedResponse(
  request: Request,
  bucket: string,
  max: number,
  windowMs: number,
  userId?: string | null,
): Response | null {
  const ip = clientIpFromHeaders(request);
  const ipKey = `rl:${bucket}:ip:${ip}`;
  const ipHit = takeToken(ipKey, max, windowMs);
  if (!ipHit.ok) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: { "Retry-After": String(ipHit.retryAfterSec) },
      },
    );
  }
  if (userId) {
    const uKey = `rl:${bucket}:uid:${userId}`;
    const uHit = takeToken(uKey, max, windowMs);
    if (!uHit.ok) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT" },
        {
          status: 429,
          headers: { "Retry-After": String(uHit.retryAfterSec) },
        },
      );
    }
  }
  return null;
}
