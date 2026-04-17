-- Optional map pin for listings (geocode or device location)
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "waste_listings" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
