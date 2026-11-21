-- ============================================================================
-- Incremental Migration 002: Profile Photos (Avatars) & Long-Term Management
-- Run this if you already ran 001_init.sql earlier.
-- ============================================================================

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Recreate student_scores_view to include avatar_url
CREATE OR REPLACE VIEW public.student_scores_view AS
SELECT
  s.id AS student_id,
  s.nisn,
  s.nis,
  s.full_name,
  s.gender,
  s.class_id,
  c.name AS class_name,
  c.major,
  c.grade_level,
  c.wali_kelas_name,
  s.parent_phone_wa,
  s.avatar_url,
  s.is_active,
  GREATEST(
    0,
    COALESCE(SUM(
      CASE
        WHEN pr.status = 'approved' AND pr.record_type = 'violation' THEN pr.points
        WHEN pr.status = 'approved' AND pr.record_type = 'redemption' THEN -pr.points
        ELSE 0
      END
    ), 0)
  )::INTEGER AS current_score,
  COALESCE(BOOL_OR(pr.status = 'approved' AND pr.is_instant_out), false) AS has_instant_out
FROM public.students s
JOIN public.classes c ON c.id = s.class_id
LEFT JOIN public.point_records pr ON pr.student_id = s.id
GROUP BY s.id, c.id;

-- Update public search RPC to return avatar_url
DROP FUNCTION IF EXISTS public.search_students_public(TEXT);
CREATE OR REPLACE FUNCTION public.search_students_public(search_query TEXT)
RETURNS TABLE (
  student_id UUID,
  nisn TEXT,
  full_name TEXT,
  class_name TEXT,
  wali_kelas_name TEXT,
  avatar_url TEXT,
  current_score INTEGER,
  has_instant_out BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned TEXT := trim(coalesce(search_query, ''));
BEGIN
  IF char_length(cleaned) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.student_id,
    v.nisn,
    v.full_name,
    v.class_name,
    v.wali_kelas_name,
    v.avatar_url,
    v.current_score,
    v.has_instant_out
  FROM public.student_scores_view v
  WHERE v.is_active = true
    AND (
      v.nisn ILIKE '%' || cleaned || '%'
      OR v.full_name ILIKE '%' || cleaned || '%'
    )
  ORDER BY v.full_name ASC
  LIMIT 12;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_students_public(TEXT) TO anon, authenticated;

-- Allow Guru to update student photos (and their own staff profile photo)
DROP POLICY IF EXISTS "Guru updates student avatar" ON public.students;
CREATE POLICY "Guru updates student avatar" ON public.students
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'guru')
  WITH CHECK (public.get_my_role() = 'guru');

DROP POLICY IF EXISTS "Staff updates own profile" ON public.staff_profiles;
CREATE POLICY "Staff updates own profile" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
