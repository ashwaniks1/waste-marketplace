-- One review per reviewer → recipient (Google-style). Keep the latest row per pair.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY from_user_id, to_user_id
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.reviews
)
DELETE FROM public.reviews r
USING ranked x
WHERE r.id = x.id
  AND x.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_from_user_to_user_key'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_from_user_to_user_key UNIQUE (from_user_id, to_user_id);
  END IF;
END $$;
