import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function jsonError(message: string, status: number, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
}

export type RouteErrorMeta = { route?: string; userId?: string };

function captureServerException(e: unknown, meta?: RouteErrorMeta) {
  if (!process.env.SENTRY_DSN) return;
  void import("@sentry/node")
    .then((Sentry) => {
      Sentry.captureException(e, {
        tags: { route: meta?.route ?? "unknown" },
        user: meta?.userId ? { id: meta.userId } : undefined,
      });
    })
    .catch(() => undefined);
}

/** Logs route + user id only — never log request bodies or PII. */
export function handleRouteError(e: unknown, meta?: RouteErrorMeta) {
  if (e instanceof ZodError) {
    return jsonError("Some details need your attention.", 400, { details: e.flatten() });
  }
  if (e instanceof HttpError) {
    return jsonError(e.message, e.status, e.extras);
  }
  const kind = e instanceof Error ? e.name : typeof e;
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined;
  console.error("[api]", { route: meta?.route, userId: meta?.userId, kind, code });
  captureServerException(e, meta);
  return jsonError("We couldn’t complete that request right now.", 500);
}
