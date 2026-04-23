#!/usr/bin/env node
/**
 * CI guard: Prisma `User` model must expose required columns for marketplace + profile flows.
 * Does not require DATABASE_URL (schema-only). Optional live check when DATABASE_URL is set.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");

const requiredSnippets = [
  'model User {',
  "@map(\"users\")",
  "firstName",
  "lastName",
  "avatarUrl",
  "phone",
  "role",
];

const schema = readFileSync(schemaPath, "utf8");
for (const s of requiredSnippets) {
  if (!schema.includes(s)) {
    console.error(`[check-users-schema] Missing expected fragment in schema: ${s}`);
    process.exit(1);
  }
}

console.log("[check-users-schema] Prisma User model includes required profile fields.");

if (process.env.DATABASE_URL) {
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const r = await client.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'users'
       and column_name = any($1::text[])`,
      [["id", "name", "email", "role", "phone", "avatar_url", "first_name", "last_name"]],
    );
    await client.end();
    const have = new Set(r.rows.map((x) => x.column_name));
    const need = ["id", "name", "email", "role", "phone", "avatar_url", "first_name", "last_name"];
    const missing = need.filter((c) => !have.has(c));
    if (missing.length) {
      console.error("[check-users-schema] Live DB missing columns:", missing.join(", "));
      process.exit(1);
    }
    console.log("[check-users-schema] Live DB users table has required columns.");
  } catch (e) {
    console.error("[check-users-schema] Live DB check failed:", e?.message ?? e);
    process.exit(1);
  }
} else {
  console.log("[check-users-schema] DATABASE_URL unset; skipped live column check.");
}
