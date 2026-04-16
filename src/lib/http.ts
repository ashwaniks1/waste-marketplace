import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/errors";

export function jsonOk<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function jsonError(message: string, status: number, extras?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extras }, { status });
}

export function handleRouteError(e: unknown) {
  if (e instanceof ZodError) {
    return jsonError("Validation failed", 400, { details: e.flatten() });
  }
  if (e instanceof HttpError) {
    return jsonError(e.message, e.status, e.extras);
  }
  console.error(e);
  return jsonError("Internal server error", 500);
}
