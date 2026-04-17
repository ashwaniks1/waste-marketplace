-- Driver pickup marketplace, user geo, notifications, review edits

DO $$ BEGIN
  CREATE TYPE "PickupJobStatus" AS ENUM ('none', 'available', 'claimed', 'assigned', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionKind" AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zip_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_lat" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_lng" DOUBLE PRECISION;

ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "delivery_required" BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE "waste_listings" ADD COLUMN "pickup_job_status" "PickupJobStatus" NOT NULL DEFAULT 'none';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "assigned_driver_id" UUID;
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "driver_commission_amount" DECIMAL(12,2);
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "driver_commission_percent" DECIMAL(5,2);
DO $$ BEGIN
  ALTER TABLE "waste_listings" ADD COLUMN "commission_kind" "CommissionKind";
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "pickup_zip" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waste_listings_assigned_driver_id_fkey'
  ) THEN
    ALTER TABLE "waste_listings"
      ADD CONSTRAINT "waste_listings_assigned_driver_id_fkey"
      FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "waste_listings_pickup_job_status_delivery_required_idx"
  ON "waste_listings" ("pickup_job_status", "delivery_required");

UPDATE "waste_listings"
SET "delivery_required" = COALESCE("delivery_available", false)
WHERE COALESCE("delivery_available", false) = true AND "delivery_required" = false;

UPDATE "waste_listings"
SET "pickup_job_status" = 'available'::"PickupJobStatus"
WHERE "delivery_required" = true
  AND "pickup_job_status" = 'none'::"PickupJobStatus"
  AND "status" IN ('open', 'accepted');

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  "default_driver_commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "platform_settings" ("id", "default_driver_commission_percent", "updated_at")
VALUES (1, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "read_at" TIMESTAMP(3),
  "listing_id" UUID,
  "conversation_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx" ON "notifications" ("user_id", "read_at");
