-- ============================================================================
-- Incremental Migration 003: Username-based Staff Login (No Real Email Needed)
-- ============================================================================

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

UPDATE public.staff_profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;
