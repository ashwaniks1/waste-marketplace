-- Supabase/Postgres: default UUIDs for listing rows
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'buyer', 'admin');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('PLASTIC', 'PAPER', 'CARDBOARD', 'METAL', 'GLASS', 'E_WASTE', 'ORGANIC', 'MIXED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('open', 'accepted', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "waste_type" "WasteType" NOT NULL,
    "quantity" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'open',
    "accepted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "waste_listings_status_idx" ON "waste_listings"("status");

-- CreateIndex
CREATE INDEX "waste_listings_user_id_idx" ON "waste_listings"("user_id");

-- CreateIndex
CREATE INDEX "waste_listings_accepted_by_idx" ON "waste_listings"("accepted_by");

-- AddForeignKey
ALTER TABLE "waste_listings" ADD CONSTRAINT "waste_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_listings" ADD CONSTRAINT "waste_listings_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
