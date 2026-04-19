import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { takeToken } from "@/lib/rateLimit";

function apiRateLimitResponse(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return null;

  const { pathname } = request.nextUrl;
  let bucket = "";
  let max = 30;
  const windowMs = 10_000;

  if (pathname === "/api/ensure-profile" && method === "POST") {
    bucket = "mw-ensure";
    max = 5;
  } else if (pathname === "/api/auth/signup" && method === "POST") {
    bucket = "mw-signup";
    max = 5;
  } else if (pathname === "/api/auth/resend-verification" && method === "POST") {
    bucket = "mw-resend";
    max = 5;
  } else if (pathname === "/api/auth/login" && method === "POST") {
    bucket = "mw-login";
    max = 10;
  } else if (pathname === "/api/profile" && method === "PATCH") {
    bucket = "mw-profile-patch";
    max = 5;
  } else if (pathname === "/api/profile" && method === "GET") {
    bucket = "mw-profile-get";
    max = 45;
  } else {
    return null;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "unknown";
  const hit = takeToken(`${bucket}:${ip}`, max, windowMs);
  if (!hit.ok) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(hit.retryAfterSec) } },
    );
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const limited = apiRateLimitResponse(request);
  if (limited) return limited;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedApp =
    pathname.startsWith("/customer") ||
    pathname.startsWith("/buyer") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/conversations");

  if (!user && isProtectedApp) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
