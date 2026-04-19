import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

function loadEnvFromDotEnv(dotEnvPath) {
  const raw = fs.readFileSync(dotEnvPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const dotEnvPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(dotEnvPath)) {
  console.error("INTROSPECTION_FAILED");
  console.error("Missing .env file in project root.");
  process.exit(1);
}

loadEnvFromDotEnv(dotEnvPath);

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("INTROSPECTION_FAILED");
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

async function main() {
  const extensions = await prisma.$queryRawUnsafe(
    "select extname as name, extversion as version from pg_extension order by extname;",
  );

  const tables = await prisma.$queryRawUnsafe(
    "select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','storage') order by n.nspname,c.relname;",
  );

  const policies = await prisma.$queryRawUnsafe(
    "select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname in ('public','storage') order by schemaname, tablename, policyname;",
  );

  let buckets = [];
  try {
    buckets = await prisma.$queryRawUnsafe(
      "select id,name,public,file_size_limit,allowed_mime_types from storage.buckets order by id;",
    );
  } catch {
    // storage schema may be unavailable under some roles; ignore
  }

  const pubs = await prisma.$queryRawUnsafe(
    "select pubname, schemaname, tablename from pg_publication_tables where pubname in ('supabase_realtime') order by schemaname, tablename;",
  );

  const enums = await prisma.$queryRawUnsafe(
    "select n.nspname as schema, t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' group by 1,2 order by 2;",
  );

  const out = { extensions, tables, policies, buckets, pubs, enums };
  process.stdout.write(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error("INTROSPECTION_FAILED");
    console.error(String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

