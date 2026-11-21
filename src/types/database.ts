export type StaffRole = "admin" | "guru";
export type RuleType = "violation" | "redemption";
export type RecordStatus = "pending" | "approved" | "rejected" | "voided";
export type MajorType = "TKJ" | "TSM" | "BC" | "LAINNYA";
export type GradeLevel = "X" | "XI" | "XII";

export interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  phone_wa?: string | null;
  wali_class?: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  major: MajorType;
  grade_level: GradeLevel;
  academic_year: string;
  wali_kelas_name: string;
}

export interface Student {
  id: string;
  nisn: string;
  nis: string | null;
  full_name: string;
  gender: "L" | "P";
  class_id: string;
  class_name: string;
  major: MajorType;
  grade_level: GradeLevel;
  wali_kelas_name: string;
  parent_phone_wa: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface StudentWithScore extends Student {
  current_score: number;
  has_instant_out: boolean;
}

export interface Rule {
  id: string;
  type: RuleType;
  category: string;
  title: string;
  points: number;
  is_instant_out: boolean;
  is_active: boolean;
}

export interface PointRecord {
  id: string;
  student_id: string;
  rule_id: string | null;
  record_type: RuleType;
  custom_title: string | null;
  category_snapshot: string;
  title_snapshot: string;
  points: number;
  is_instant_out: boolean;
  notes: string | null;
  evidence_url: string | null;
  status: RecordStatus;
  reported_by: string | null;
  reported_by_name: string;
  verified_by: string | null;
  verified_by_name: string | null;
  status_reason: string | null;
  incident_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface WarningLog {
  id: string;
  student_id: string;
  stage: number;
  action_type: string;
  score_snapshot: number;
  notes: string | null;
  issued_by_name: string;
  issued_at: string;
}
