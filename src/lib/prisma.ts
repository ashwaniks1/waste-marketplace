import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for serverless — avoids exhausting connections in dev HMR.
 * Uses Supabase Postgres via DATABASE_URL (pooler or direct per your Supabase settings).
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
