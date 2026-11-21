-- ============================================================================
-- E-Disiplin SMK Global Insan Tangerang — Initial Supabase PostgreSQL Migration
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New Query)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STAFF PROFILES (Admin/BK & Guru — linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru')) DEFAULT 'guru',
  phone_wa TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CLASSES (7 Kelas Utama: TKJ, TSM, BC)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  major TEXT NOT NULL CHECK (major IN ('TKJ', 'TSM', 'BC', 'LAINNYA')),
  grade_level TEXT NOT NULL CHECK (grade_level IN ('X', 'XI', 'XII')),
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  wali_kelas_name TEXT NOT NULL DEFAULT '-',
  wali_kelas_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. STUDENTS (93 students from Dapodik Kelas Utama)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn TEXT UNIQUE NOT NULL,
  nis TEXT,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  parent_phone_wa TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RULES (Tata Tertib Pelanggaran, Instant OUT, Prestasi, Organisasi, Penebusan BK)
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('violation', 'redemption')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  is_instant_out BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. POINT RECORDS (Auditable Ledger with Verification Queue & Custom Reasons)
CREATE TABLE IF NOT EXISTS public.point_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.rules(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('violation', 'redemption')),
  custom_title TEXT,
  category_snapshot TEXT NOT NULL DEFAULT 'Umum',
  title_snapshot TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  is_instant_out BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'voided')) DEFAULT 'pending',
  reported_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT NOT NULL,
  verified_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  verified_by_name TEXT,
  status_reason TEXT,
  incident_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WARNING LOGS (Tracks issued Panggilan / SP1 / SP2 / Rapat Dewan Guru)
CREATE TABLE IF NOT EXISTS public.warning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  action_type TEXT NOT NULL,
  score_snapshot INTEGER NOT NULL,
  notes TEXT,
  issued_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  issued_by_name TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students USING gin (to_tsvector('simple', full_name));
CREATE INDEX IF NOT EXISTS idx_point_records_student ON public.point_records(student_id);
CREATE INDEX IF NOT EXISTS idx_point_records_status ON public.point_records(status);

-- ============================================================================
-- DYNAMIC SCORE VIEW (Single Source of Truth — Only 'approved' counts!)
-- ============================================================================
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

-- ============================================================================
-- HELPER FUNCTION: Check current staff role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.staff_profiles WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- ============================================================================
-- PUBLIC RPCs FOR GUEST SEARCH-TO-REVEAL (Blocks raw SELECT * dumping!)
-- ============================================================================
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

CREATE OR REPLACE FUNCTION public.get_student_timeline_public(target_nisn TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_row JSONB;
  records_json JSONB;
BEGIN
  SELECT to_jsonb(v) - 'parent_phone_wa'
  INTO student_row
  FROM public.student_scores_view v
  WHERE v.nisn = trim(target_nisn) AND v.is_active = true
  LIMIT 1;

  IF student_row IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pr.id,
      'record_type', pr.record_type,
      'category_snapshot', pr.category_snapshot,
      'title_snapshot', pr.title_snapshot,
      'points', pr.points,
      'is_instant_out', pr.is_instant_out,
      'notes', pr.notes,
      'evidence_url', pr.evidence_url,
      'reported_by_name', pr.reported_by_name,
      'verified_by_name', pr.verified_by_name,
      'incident_at', pr.incident_at
    ) ORDER BY pr.incident_at DESC
  ), '[]'::jsonb)
  INTO records_json
  FROM public.point_records pr
  WHERE pr.student_id = (student_row->>'student_id')::UUID
    AND pr.status = 'approved';

  RETURN jsonb_build_object(
    'student', student_row,
    'records', records_json
  );
END;
$$;

-- Allow anonymous & authenticated clients to call public lookup RPCs
GRANT EXECUTE ON FUNCTION public.search_students_public(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_timeline_public(TEXT) TO anon, authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warning_logs ENABLE ROW LEVEL SECURITY;

-- RULES: Public can read active Tata Tertib rules; Admin can manage
CREATE POLICY "Public can read active rules" ON public.rules
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admin manages rules" ON public.rules
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- CLASSES: Staff can read; Admin manages
CREATE POLICY "Staff reads classes" ON public.classes
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('admin', 'guru'));
CREATE POLICY "Admin manages classes" ON public.classes
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- STAFF PROFILES: Staff reads profiles; Staff updates own profile; Admin manages all
CREATE POLICY "Staff reads staff profiles" ON public.staff_profiles
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('admin', 'guru'));
CREATE POLICY "Staff updates own profile" ON public.staff_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admin manages staff profiles" ON public.staff_profiles
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- STUDENTS: Staff reads all; Guru can update photo; Admin manages all (Guests MUST use search_students_public RPC!)
CREATE POLICY "Staff reads students" ON public.students
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('admin', 'guru'));
CREATE POLICY "Guru updates student avatar" ON public.students
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'guru') WITH CHECK (public.get_my_role() = 'guru');
CREATE POLICY "Admin manages students" ON public.students
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- POINT RECORDS:
-- Admin: full access
-- Guru: can read approved records + own submitted records; can insert pending violations
CREATE POLICY "Admin manages point records" ON public.point_records
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Guru reads approved or own records" ON public.point_records
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'guru'
    AND (status = 'approved' OR reported_by = auth.uid())
  );

CREATE POLICY "Guru inserts pending violations" ON public.point_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'guru'
    AND status = 'pending'
    AND record_type = 'violation'
    AND reported_by = auth.uid()
  );

-- WARNING LOGS: Staff reads; Admin manages
CREATE POLICY "Staff reads warning logs" ON public.warning_logs
  FOR SELECT TO authenticated USING (public.get_my_role() IN ('admin', 'guru'));
CREATE POLICY "Admin manages warning logs" ON public.warning_logs
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================================
-- STORAGE BUCKET FOR OPTIONAL PHOTO / CCTV EVIDENCE
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public views evidence photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'evidence-photos');

CREATE POLICY "Authenticated staff uploads evidence photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence-photos' AND public.get_my_role() IN ('admin', 'guru'));
