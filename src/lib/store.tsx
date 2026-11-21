"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeUsername, toAuthEmail } from "@/lib/auth-utils";
import {
  SEED_CLASSES,
  SEED_DEMO_RECORDS,
  SEED_RULES,
  SEED_STAFF,
  SEED_STUDENTS,
  SEED_WARNING_LOGS,
} from "@/lib/seed-data";
import type {
  GradeLevel,
  MajorType,
  PointRecord,
  Rule,
  RuleType,
  SchoolClass,
  StaffProfile,
  StaffRole,
  Student,
  StudentWithScore,
  WarningLog,
} from "@/types/database";

const STORAGE_KEY = "edisiplin_gi_demo_v2";

interface CreateRecordInput {
  student_id: string;
  rule_id: string | null;
  record_type: RuleType;
  custom_title: string | null;
  category_snapshot: string;
  title_snapshot: string;
  points: number;
  is_instant_out: boolean;
  notes: string | null;
  evidence_file?: Blob | null;
  evidence_data_url?: string | null;
  incident_at: string;
}

interface CreateStudentInput {
  nisn: string;
  nis: string | null;
  full_name: string;
  gender: "L" | "P";
  class_id: string;
  parent_phone_wa: string | null;
  avatar_file?: Blob | null;
  avatar_data_url?: string | null;
}

interface UpdateStudentInput {
  nisn?: string;
  nis?: string | null;
  full_name?: string;
  gender?: "L" | "P";
  class_id?: string;
  parent_phone_wa?: string | null;
  is_active?: boolean;
  avatar_file?: Blob | null;
  avatar_data_url?: string | null;
  clear_avatar?: boolean;
}

interface CreateStaffInput {
  full_name: string;
  username: string;
  password?: string;
  role: StaffRole;
  phone_wa?: string | null;
  wali_class?: string | null;
  avatar_file?: Blob | null;
  avatar_data_url?: string | null;
}

interface UpdateStaffInput {
  full_name?: string;
  username?: string;
  role?: StaffRole;
  phone_wa?: string | null;
  wali_class?: string | null;
  is_active?: boolean;
  avatar_file?: Blob | null;
  avatar_data_url?: string | null;
  clear_avatar?: boolean;
}

interface CreateClassInput {
  name: string;
  major: MajorType;
  grade_level: GradeLevel;
  academic_year: string;
  wali_kelas_name: string;
}

interface CreateRuleInput {
  type: RuleType;
  category: string;
  title: string;
  points: number;
  is_instant_out: boolean;
}

export interface PublicSearchHit {
  student_id: string;
  nisn: string;
  full_name: string;
  class_name: string;
  wali_kelas_name: string;
  avatar_url: string | null;
  current_score: number;
  has_instant_out: boolean;
}

interface AppContextValue {
  mode: "supabase" | "demo";
  loading: boolean;
  user: StaffProfile | null;
  classes: SchoolClass[];
  students: StudentWithScore[];
  rules: Rule[];
  records: PointRecord[];
  staffList: StaffProfile[];
  warningLogs: WarningLog[];
  pendingCount: number;
  // Auth
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemoAs: (staffId: string) => void;
  logout: () => Promise<void>;
  // Public search-to-reveal
  searchPublicStudents: (query: string) => Promise<PublicSearchHit[]>;
  getPublicStudentByNisn: (nisn: string) => Promise<{ student: StudentWithScore; records: PointRecord[] } | null>;
  // Point Records
  createPointRecord: (input: CreateRecordInput) => Promise<{ ok: boolean; error?: string }>;
  verifyPointRecord: (recordId: string, decision: "approved" | "rejected", adjustedPoints?: number, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  voidPointRecord: (recordId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  // Students
  addStudent: (input: CreateStudentInput) => Promise<{ ok: boolean; error?: string }>;
  updateStudent: (studentId: string, input: UpdateStudentInput) => Promise<{ ok: boolean; error?: string }>;
  deleteStudent: (studentId: string) => Promise<{ ok: boolean; error?: string }>;
  updateStudentAvatar: (studentId: string, blob: Blob | null, dataUrl: string | null) => Promise<{ ok: boolean; error?: string }>;
  updateStudentPhone: (studentId: string, phone: string) => Promise<void>;
  importStudentsBulk: (items: CreateStudentInput[]) => Promise<{ added: number; skipped: number }>;
  // Staff & Classes
  addStaff: (input: CreateStaffInput) => Promise<{ ok: boolean; error?: string }>;
  updateStaff: (staffId: string, input: UpdateStaffInput) => Promise<{ ok: boolean; error?: string }>;
  deleteStaff: (staffId: string) => Promise<{ ok: boolean; error?: string }>;
  resetStaffPassword: (staffId: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  addClass: (input: CreateClassInput) => Promise<{ ok: boolean; error?: string }>;
  // Rules & Warnings
  addRule: (input: CreateRuleInput) => Promise<{ ok: boolean; error?: string }>;
  toggleRuleActive: (ruleId: string) => Promise<void>;
  logWarningIssued: (studentId: string, stage: number, actionType: string, scoreSnapshot: number, notes?: string) => Promise<void>;
  resetDemoData: () => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function computeScores(students: Student[], records: PointRecord[]): StudentWithScore[] {
  const scoreMap = new Map<string, number>();
  const outMap = new Map<string, boolean>();

  for (const r of records) {
    if (r.status !== "approved") continue;
    const prev = scoreMap.get(r.student_id) ?? 0;
    const delta = r.record_type === "violation" ? r.points : -r.points;
    scoreMap.set(r.student_id, prev + delta);
    if (r.is_instant_out) outMap.set(r.student_id, true);
  }

  return students.map((s) => ({
    ...s,
    current_score: Math.max(0, scoreMap.get(s.id) ?? 0),
    has_instant_out: Boolean(outMap.get(s.id)),
  }));
}

async function uploadPhotoToSupabase(folder: string, blob: Blob): Promise<string | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const filename = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("evidence-photos").upload(filename, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from("evidence-photos").getPublicUrl(filename);
  return data.publicUrl;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mode: "supabase" | "demo" = isSupabaseConfigured ? "supabase" : "demo";
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>(SEED_CLASSES);
  const [rawStudents, setRawStudents] = useState<Student[]>(SEED_STUDENTS);
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [records, setRecords] = useState<PointRecord[]>(SEED_DEMO_RECORDS);
  const [staffList, setStaffList] = useState<StaffProfile[]>(SEED_STAFF);
  const [warningLogs, setWarningLogs] = useState<WarningLog[]>(SEED_WARNING_LOGS);

  const persistDemo = useCallback(
    (next: {
      classes?: SchoolClass[];
      students?: Student[];
      rules?: Rule[];
      records?: PointRecord[];
      staffList?: StaffProfile[];
      warningLogs?: WarningLog[];
      userId?: string | null;
    }) => {
      if (mode !== "demo" || typeof window === "undefined") return;
      try {
        const currentRaw = window.localStorage.getItem(STORAGE_KEY);
        const current = currentRaw ? JSON.parse(currentRaw) : {};
        const merged = { ...current, ...next };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore storage quota issues
      }
    },
    [mode]
  );

  const loadSupabaseData = useCallback(async (staffUser: StaffProfile | null) => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    const { data: rulesData } = await sb.from("rules").select("*").order("category").order("title");
    if (rulesData) setRules(rulesData as Rule[]);

    if (!staffUser) {
      setRawStudents([]);
      setRecords([]);
      setWarningLogs([]);
      return;
    }

    const [clsRes, stuRes, recRes, staffRes, warnRes] = await Promise.all([
      sb.from("classes").select("*").order("name"),
      sb.from("students").select("*, classes(name, major, grade_level, wali_kelas_name)").order("full_name"),
      sb.from("point_records").select("*").order("incident_at", { ascending: false }),
      sb.from("staff_profiles").select("*").order("full_name"),
      sb.from("warning_logs").select("*").order("issued_at", { ascending: false }),
    ]);

    if (clsRes.data) setClasses(clsRes.data as SchoolClass[]);
    if (stuRes.data) {
      const mapped: Student[] = stuRes.data.map((row: Record<string, unknown>) => {
        const cls = (row.classes as Record<string, string>) || {};
        return {
          id: String(row.id),
          nisn: String(row.nisn),
          nis: (row.nis as string | null) ?? null,
          full_name: String(row.full_name),
          gender: (row.gender as "L" | "P") || "L",
          class_id: String(row.class_id),
          class_name: cls.name || "-",
          major: (cls.major as Student["major"]) || "TKJ",
          grade_level: (cls.grade_level as Student["grade_level"]) || "X",
          wali_kelas_name: cls.wali_kelas_name || "-",
          parent_phone_wa: (row.parent_phone_wa as string | null) ?? null,
          avatar_url: (row.avatar_url as string | null) ?? null,
          is_active: Boolean(row.is_active),
        };
      });
      setRawStudents(mapped);
    }
    if (recRes.data) setRecords(recRes.data as PointRecord[]);
    if (staffRes.data) {
      const mappedStaff = (staffRes.data as StaffProfile[]).map((s) => ({
        ...s,
        username: s.username || normalizeUsername(s.email),
        avatar_url: s.avatar_url ?? null,
      }));
      setStaffList(mappedStaff);
      const updatedMe = mappedStaff.find((s) => s.id === staffUser.id);
      if (updatedMe) setUser(updatedMe);
    }
    if (warnRes.data) setWarningLogs(warnRes.data as WarningLog[]);
  }, []);

  const refreshData = useCallback(async () => {
    if (mode === "supabase") {
      await loadSupabaseData(user);
    }
  }, [mode, loadSupabaseData, user]);

  useEffect(() => {
    let active = true;
    async function init() {
      if (mode === "demo") {
        try {
          const saved = window.localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const loadedStaff: StaffProfile[] = Array.isArray(parsed.staffList)
              ? parsed.staffList.map((s: StaffProfile) => ({
                  ...s,
                  username: s.username || normalizeUsername(s.email || s.full_name),
                }))
              : SEED_STAFF;
            if (Array.isArray(parsed.classes)) setClasses(parsed.classes);
            if (Array.isArray(parsed.students)) setRawStudents(parsed.students);
            if (Array.isArray(parsed.rules)) setRules(parsed.rules);
            if (Array.isArray(parsed.records)) setRecords(parsed.records);
            if (Array.isArray(parsed.staffList)) setStaffList(loadedStaff);
            if (Array.isArray(parsed.warningLogs)) setWarningLogs(parsed.warningLogs);
            if (parsed.userId) {
              const found = loadedStaff.find((s) => s.id === parsed.userId) || null;
              setUser(found);
            }
          }
        } catch {
          // Ignore malformed demo state
        }
        if (active) setLoading(false);
        return;
      }

      const sb = getSupabaseBrowserClient();
      if (!sb) {
        if (active) setLoading(false);
        return;
      }

      const { data: sessionData } = await sb.auth.getSession();
      let staffUser: StaffProfile | null = null;
      if (sessionData.session?.user) {
        const { data: prof } = await sb
          .from("staff_profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();
        if (prof) staffUser = { ...(prof as StaffProfile), avatar_url: (prof as StaffProfile).avatar_url ?? null };
      }
      if (!active) return;
      setUser(staffUser);
      await loadSupabaseData(staffUser);
      if (active) setLoading(false);
    }

    init();
    return () => {
      active = false;
    };
  }, [mode, loadSupabaseData]);

  const students = useMemo(() => computeScores(rawStudents, records), [rawStudents, records]);
  const pendingCount = useMemo(() => records.filter((r) => r.status === "pending").length, [records]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const cleanInput = usernameOrEmail.trim().toLowerCase();
      const authEmail = toAuthEmail(cleanInput);
      const cleanUser = normalizeUsername(cleanInput);

      if (mode === "demo") {
        const match = staffList.find(
          (s) =>
            s.is_active &&
            (s.username.toLowerCase() === cleanUser ||
              s.email.toLowerCase() === cleanInput ||
              s.email.toLowerCase() === authEmail)
        );
        if (!match) {
          return { ok: false, error: "Username tidak ditemukan atau akun dinonaktifkan. Coba: admin atau avandi." };
        }
        if (!password || password.length < 4) {
          return { ok: false, error: "Masukkan kata sandi (minimal 4 karakter di mode demo)." };
        }
        setUser(match);
        persistDemo({ userId: match.id });
        return { ok: true };
      }

      const sb = getSupabaseBrowserClient();
      if (!sb) return { ok: false, error: "Konfigurasi Supabase belum lengkap." };
      const { data, error } = await sb.auth.signInWithPassword({ email: authEmail, password });
      if (error || !data.user) {
        return { ok: false, error: "Username atau kata sandi salah." };
      }
      const { data: prof, error: profErr } = await sb
        .from("staff_profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      if (profErr || !prof) {
        await sb.auth.signOut();
        return { ok: false, error: "Akun belum terdaftar di tabel staff_profiles." };
      }
      const rawProf = prof as StaffProfile;
      const staffUser: StaffProfile = {
        ...rawProf,
        username: rawProf.username || normalizeUsername(rawProf.email),
        avatar_url: rawProf.avatar_url ?? null,
      };
      setUser(staffUser);
      await loadSupabaseData(staffUser);
      return { ok: true };
    },
    [mode, staffList, persistDemo, loadSupabaseData]
  );

  const loginDemoAs = useCallback(
    (staffId: string) => {
      const match = staffList.find((s) => s.id === staffId) || staffList[0];
      setUser(match);
      persistDemo({ userId: match.id });
    },
    [staffList, persistDemo]
  );

  const logout = useCallback(async () => {
    if (mode === "supabase") {
      const sb = getSupabaseBrowserClient();
      if (sb) await sb.auth.signOut();
      setUser(null);
      await loadSupabaseData(null);
    } else {
      setUser(null);
      persistDemo({ userId: null });
    }
  }, [mode, persistDemo, loadSupabaseData]);

  const searchPublicStudents = useCallback(
    async (query: string): Promise<PublicSearchHit[]> => {
      const cleaned = query.trim();
      if (cleaned.length < 3) return [];

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return [];
        const { data, error } = await sb.rpc("search_students_public", { search_query: cleaned });
        if (error || !data) return [];
        return (data as PublicSearchHit[]).map((d) => ({ ...d, avatar_url: d.avatar_url ?? null }));
      }

      const lower = cleaned.toLowerCase();
      return students
        .filter((s) => s.is_active && (s.nisn.includes(lower) || s.full_name.toLowerCase().includes(lower)))
        .slice(0, 12)
        .map((s) => ({
          student_id: s.id,
          nisn: s.nisn,
          full_name: s.full_name,
          class_name: s.class_name,
          wali_kelas_name: s.wali_kelas_name,
          avatar_url: s.avatar_url,
          current_score: s.current_score,
          has_instant_out: s.has_instant_out,
        }));
    },
    [mode, students]
  );

  const getPublicStudentByNisn = useCallback(
    async (nisn: string): Promise<{ student: StudentWithScore; records: PointRecord[] } | null> => {
      const cleaned = nisn.trim();
      if (mode === "supabase" && !user) {
        const sb = getSupabaseBrowserClient();
        if (!sb) return null;
        const { data, error } = await sb.rpc("get_student_timeline_public", { target_nisn: cleaned });
        if (error || !data || !data.student) return null;
        const st = data.student;
        return {
          student: {
            id: st.student_id,
            nisn: st.nisn,
            nis: st.nis ?? null,
            full_name: st.full_name,
            gender: st.gender,
            class_id: st.class_id,
            class_name: st.class_name,
            major: st.major,
            grade_level: st.grade_level,
            wali_kelas_name: st.wali_kelas_name,
            parent_phone_wa: null,
            avatar_url: st.avatar_url ?? null,
            is_active: true,
            current_score: st.current_score ?? 0,
            has_instant_out: Boolean(st.has_instant_out),
          },
          records: (data.records || []).map((r: Record<string, unknown>) => ({
            ...r,
            student_id: st.student_id,
            rule_id: null,
            custom_title: null,
            status: "approved",
            reported_by: null,
            verified_by: null,
            status_reason: null,
            verified_at: null,
            created_at: r.incident_at,
          })) as PointRecord[],
        };
      }

      const found = students.find((s) => s.nisn === cleaned);
      if (!found) return null;
      const stuRecords = records
        .filter((r) => r.student_id === found.id && (user ? true : r.status === "approved"))
        .sort((a, b) => new Date(b.incident_at).getTime() - new Date(a.incident_at).getTime());
      return { student: found, records: stuRecords };
    },
    [mode, user, students, records]
  );

  const createPointRecord = useCallback(
    async (input: CreateRecordInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Harus login sebagai Guru atau Admin/BK." };
      const isAdmin = user.role === "admin";
      if (!isAdmin && input.record_type === "redemption") {
        return { ok: false, error: "Hanya Admin/BK yang dapat mencatat penebusan poin." };
      }

      const nowIso = new Date().toISOString();

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase client error." };

        let uploadedUrl: string | null = null;
        if (input.evidence_file) {
          try {
            uploadedUrl = await uploadPhotoToSupabase(`evidence/${input.student_id}`, input.evidence_file);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }

        const payload = {
          student_id: input.student_id,
          rule_id: input.rule_id,
          record_type: input.record_type,
          custom_title: input.custom_title,
          category_snapshot: input.category_snapshot,
          title_snapshot: input.title_snapshot,
          points: input.points,
          is_instant_out: input.is_instant_out,
          notes: input.notes,
          evidence_url: uploadedUrl,
          status: isAdmin ? "approved" : "pending",
          reported_by: user.id,
          reported_by_name: user.full_name,
          verified_by: isAdmin ? user.id : null,
          verified_by_name: isAdmin ? user.full_name : null,
          incident_at: input.incident_at || nowIso,
          verified_at: isAdmin ? nowIso : null,
        };

        const { error } = await sb.from("point_records").insert(payload);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const newRec: PointRecord = {
        id: `rec-${Date.now()}`,
        student_id: input.student_id,
        rule_id: input.rule_id,
        record_type: input.record_type,
        custom_title: input.custom_title,
        category_snapshot: input.category_snapshot,
        title_snapshot: input.title_snapshot,
        points: input.points,
        is_instant_out: input.is_instant_out,
        notes: input.notes,
        evidence_url: input.evidence_data_url || null,
        status: isAdmin ? "approved" : "pending",
        reported_by: user.id,
        reported_by_name: user.full_name,
        verified_by: isAdmin ? user.id : null,
        verified_by_name: isAdmin ? user.full_name : null,
        status_reason: null,
        incident_at: input.incident_at || nowIso,
        verified_at: isAdmin ? nowIso : null,
        created_at: nowIso,
      };
      const next = [newRec, ...records];
      setRecords(next);
      persistDemo({ records: next });
      return { ok: true };
    },
    [user, mode, records, persistDemo, loadSupabaseData]
  );

  const verifyPointRecord = useCallback(
    async (
      recordId: string,
      decision: "approved" | "rejected",
      adjustedPoints?: number,
      reason?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      const nowIso = new Date().toISOString();

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        const patch: Record<string, unknown> = {
          status: decision,
          verified_by: user.id,
          verified_by_name: user.full_name,
          verified_at: nowIso,
          status_reason: reason || null,
        };
        if (typeof adjustedPoints === "number" && adjustedPoints >= 0) {
          patch.points = adjustedPoints;
        }
        const { error } = await sb.from("point_records").update(patch).eq("id", recordId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const next = records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: decision,
              points: typeof adjustedPoints === "number" && adjustedPoints >= 0 ? adjustedPoints : r.points,
              verified_by: user.id,
              verified_by_name: user.full_name,
              verified_at: nowIso,
              status_reason: reason || null,
            }
          : r
      );
      setRecords(next);
      persistDemo({ records: next });
      return { ok: true };
    },
    [user, mode, records, persistDemo, loadSupabaseData]
  );

  const voidPointRecord = useCallback(
    async (recordId: string, reason: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      if (!reason.trim()) return { ok: false, error: "Alasan pembatalan wajib diisi." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        const { error } = await sb
          .from("point_records")
          .update({ status: "voided", status_reason: reason.trim() })
          .eq("id", recordId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const next = records.map((r) =>
        r.id === recordId ? { ...r, status: "voided" as const, status_reason: reason.trim() } : r
      );
      setRecords(next);
      persistDemo({ records: next });
      return { ok: true };
    },
    [user, mode, records, persistDemo, loadSupabaseData]
  );

  const addStudent = useCallback(
    async (input: CreateStudentInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      const cls = classes.find((c) => c.id === input.class_id);
      if (!cls) return { ok: false, error: "Kelas tidak valid." };
      if (rawStudents.some((s) => s.nisn === input.nisn.trim())) {
        return { ok: false, error: "NISN sudah terdaftar." };
      }

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        let avatarUrl: string | null = null;
        if (input.avatar_file) {
          try {
            avatarUrl = await uploadPhotoToSupabase("avatars/students", input.avatar_file);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }
        const { error } = await sb.from("students").insert({
          nisn: input.nisn.trim(),
          nis: input.nis?.trim() || null,
          full_name: input.full_name.trim(),
          gender: input.gender,
          class_id: input.class_id,
          parent_phone_wa: input.parent_phone_wa?.trim() || null,
          avatar_url: avatarUrl,
        });
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const newStu: Student = {
        id: `stu-${input.nisn.trim()}`,
        nisn: input.nisn.trim(),
        nis: input.nis?.trim() || null,
        full_name: input.full_name.trim(),
        gender: input.gender,
        class_id: cls.id,
        class_name: cls.name,
        major: cls.major,
        grade_level: cls.grade_level,
        wali_kelas_name: cls.wali_kelas_name,
        parent_phone_wa: input.parent_phone_wa?.trim() || null,
        avatar_url: input.avatar_data_url || null,
        is_active: true,
      };
      const next = [...rawStudents, newStu].sort((a, b) => a.full_name.localeCompare(b.full_name));
      setRawStudents(next);
      persistDemo({ students: next });
      return { ok: true };
    },
    [user, mode, classes, rawStudents, persistDemo, loadSupabaseData]
  );

  const updateStudent = useCallback(
    async (studentId: string, input: UpdateStudentInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      const target = rawStudents.find((s) => s.id === studentId);
      if (!target) return { ok: false, error: "Siswa tidak ditemukan." };

      const nextNisn = input.nisn ? input.nisn.trim() : target.nisn;
      if (nextNisn !== target.nisn && rawStudents.some((s) => s.nisn === nextNisn)) {
        return { ok: false, error: "NISN sudah digunakan siswa lain." };
      }

      const nextCls = input.class_id ? classes.find((c) => c.id === input.class_id) : classes.find((c) => c.id === target.class_id);
      if (!nextCls) return { ok: false, error: "Kelas tidak valid." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        let avatarUrl = target.avatar_url;
        if (input.clear_avatar) avatarUrl = null;
        else if (input.avatar_file) {
          try {
            avatarUrl = await uploadPhotoToSupabase("avatars/students", input.avatar_file);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }
        const { error } = await sb
          .from("students")
          .update({
            nisn: nextNisn,
            nis: input.nis !== undefined ? input.nis?.trim() || null : target.nis,
            full_name: input.full_name ? input.full_name.trim() : target.full_name,
            gender: input.gender || target.gender,
            class_id: nextCls.id,
            parent_phone_wa: input.parent_phone_wa !== undefined ? input.parent_phone_wa?.trim() || null : target.parent_phone_wa,
            is_active: input.is_active !== undefined ? input.is_active : target.is_active,
            avatar_url: avatarUrl,
          })
          .eq("id", studentId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const nextAvatar = input.clear_avatar
        ? null
        : input.avatar_data_url !== undefined
        ? input.avatar_data_url
        : target.avatar_url;

      const next = rawStudents
        .map((s) =>
          s.id === studentId
            ? {
                ...s,
                nisn: nextNisn,
                nis: input.nis !== undefined ? input.nis?.trim() || null : s.nis,
                full_name: input.full_name ? input.full_name.trim() : s.full_name,
                gender: input.gender || s.gender,
                class_id: nextCls.id,
                class_name: nextCls.name,
                major: nextCls.major,
                grade_level: nextCls.grade_level,
                wali_kelas_name: nextCls.wali_kelas_name,
                parent_phone_wa: input.parent_phone_wa !== undefined ? input.parent_phone_wa?.trim() || null : s.parent_phone_wa,
                is_active: input.is_active !== undefined ? input.is_active : s.is_active,
                avatar_url: nextAvatar,
              }
            : s
        )
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setRawStudents(next);
      persistDemo({ students: next });
      return { ok: true };
    },
    [user, mode, classes, rawStudents, persistDemo, loadSupabaseData]
  );

  const deleteStudent = useCallback(
    async (studentId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        const { error } = await sb.from("students").delete().eq("id", studentId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const nextStudents = rawStudents.filter((s) => s.id !== studentId);
      const nextRecords = records.filter((r) => r.student_id !== studentId);
      const nextWarnings = warningLogs.filter((w) => w.student_id !== studentId);
      setRawStudents(nextStudents);
      setRecords(nextRecords);
      setWarningLogs(nextWarnings);
      persistDemo({ students: nextStudents, records: nextRecords, warningLogs: nextWarnings });
      return { ok: true };
    },
    [user, mode, rawStudents, records, warningLogs, persistDemo, loadSupabaseData]
  );

  // Callable by BOTH Admin/BK and Guru so teachers can easily update student photos!
  const updateStudentAvatar = useCallback(
    async (studentId: string, blob: Blob | null, dataUrl: string | null): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Harus login sebagai Guru atau Admin/BK." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        let avatarUrl: string | null = null;
        if (blob) {
          try {
            avatarUrl = await uploadPhotoToSupabase("avatars/students", blob);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }
        const { error } = await sb.from("students").update({ avatar_url: avatarUrl }).eq("id", studentId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const next = rawStudents.map((s) => (s.id === studentId ? { ...s, avatar_url: dataUrl } : s));
      setRawStudents(next);
      persistDemo({ students: next });
      return { ok: true };
    },
    [user, mode, rawStudents, persistDemo, loadSupabaseData]
  );

  const updateStudentPhone = useCallback(
    async (studentId: string, phone: string) => {
      if (!user || user.role !== "admin") return;
      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return;
        await sb.from("students").update({ parent_phone_wa: phone.trim() || null }).eq("id", studentId);
        await loadSupabaseData(user);
        return;
      }
      const next = rawStudents.map((s) =>
        s.id === studentId ? { ...s, parent_phone_wa: phone.trim() || null } : s
      );
      setRawStudents(next);
      persistDemo({ students: next });
    },
    [user, mode, rawStudents, persistDemo, loadSupabaseData]
  );

  const importStudentsBulk = useCallback(
    async (items: CreateStudentInput[]): Promise<{ added: number; skipped: number }> => {
      if (!user || user.role !== "admin") return { added: 0, skipped: items.length };
      const existingNisns = new Set(rawStudents.map((s) => s.nisn));
      const toAdd: Student[] = [];
      let skipped = 0;

      for (const item of items) {
        const nisn = item.nisn.trim();
        const cls = classes.find((c) => c.id === item.class_id);
        if (!nisn || !cls || existingNisns.has(nisn)) {
          skipped++;
          continue;
        }
        existingNisns.add(nisn);
        toAdd.push({
          id: `stu-${nisn}`,
          nisn,
          nis: item.nis?.trim() || null,
          full_name: item.full_name.trim(),
          gender: item.gender,
          class_id: cls.id,
          class_name: cls.name,
          major: cls.major,
          grade_level: cls.grade_level,
          wali_kelas_name: cls.wali_kelas_name,
          parent_phone_wa: item.parent_phone_wa?.trim() || null,
          avatar_url: null,
          is_active: true,
        });
      }

      if (toAdd.length === 0) return { added: 0, skipped };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (sb) {
          await sb.from("students").upsert(
            toAdd.map((s) => ({
              nisn: s.nisn,
              nis: s.nis,
              full_name: s.full_name,
              gender: s.gender,
              class_id: s.class_id,
              parent_phone_wa: s.parent_phone_wa,
            })),
            { onConflict: "nisn", ignoreDuplicates: true }
          );
          await loadSupabaseData(user);
        }
        return { added: toAdd.length, skipped };
      }

      const next = [...rawStudents, ...toAdd].sort((a, b) => a.full_name.localeCompare(b.full_name));
      setRawStudents(next);
      persistDemo({ students: next });
      return { added: toAdd.length, skipped };
    },
    [user, mode, classes, rawStudents, persistDemo, loadSupabaseData]
  );

  // === STAFF (TEACHERS & ADMIN/BK) MANAGEMENT ===
  const addStaff = useCallback(
    async (input: CreateStaffInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      const cleanUser = normalizeUsername(input.username);
      const authEmail = toAuthEmail(input.username);
      if (!input.full_name.trim() || !cleanUser) {
        return { ok: false, error: "Nama lengkap dan username (huruf/angka tanpa spasi) wajib diisi." };
      }
      if (staffList.some((s) => s.username.toLowerCase() === cleanUser || s.email.toLowerCase() === authEmail)) {
        return { ok: false, error: "Username tersebut sudah dipakai akun lain." };
      }

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        const token = (await sb?.auth.getSession())?.data.session?.access_token || "";
        let avatarUrl: string | null = null;
        if (input.avatar_file) {
          try {
            avatarUrl = await uploadPhotoToSupabase("avatars/staff", input.avatar_file);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }
        const resp = await fetch("/api/admin/staff", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            full_name: input.full_name.trim(),
            username: cleanUser,
            password: input.password || "globalinsan123",
            role: input.role,
            phone_wa: input.phone_wa || null,
            avatar_url: avatarUrl,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) return { ok: false, error: data.error || "Gagal menambahkan akun staff." };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const newStaff: StaffProfile = {
        id: `staff-${Date.now()}`,
        username: cleanUser,
        full_name: input.full_name.trim(),
        email: authEmail,
        role: input.role,
        phone_wa: input.phone_wa?.trim() || null,
        wali_class: input.wali_class || null,
        avatar_url: input.avatar_data_url || null,
        is_active: true,
      };
      const next = [...staffList, newStaff].sort((a, b) => a.full_name.localeCompare(b.full_name));
      setStaffList(next);
      persistDemo({ staffList: next });
      return { ok: true };
    },
    [user, mode, staffList, persistDemo, loadSupabaseData]
  );

  const updateStaff = useCallback(
    async (staffId: string, input: UpdateStaffInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Harus login." };
      const isSelf = user.id === staffId;
      if (user.role !== "admin" && !isSelf) return { ok: false, error: "Anda hanya dapat mengubah profil Anda sendiri." };

      const target = staffList.find((s) => s.id === staffId);
      if (!target) return { ok: false, error: "Data guru tidak ditemukan." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        let avatarUrl = target.avatar_url;
        if (input.clear_avatar) avatarUrl = null;
        else if (input.avatar_file) {
          try {
            avatarUrl = await uploadPhotoToSupabase("avatars/staff", input.avatar_file);
          } catch (err) {
            return { ok: false, error: `Gagal upload foto: ${err instanceof Error ? err.message : "Error"}` };
          }
        }
        const patch: Record<string, unknown> = { avatar_url: avatarUrl };
        if (user.role === "admin") {
          if (input.full_name) patch.full_name = input.full_name.trim();
          if (input.role) patch.role = input.role;
          if (input.phone_wa !== undefined) patch.phone_wa = input.phone_wa?.trim() || null;
          if (input.is_active !== undefined) patch.is_active = input.is_active;
        }
        const { error } = await sb.from("staff_profiles").update(patch).eq("id", staffId);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const nextAvatar = input.clear_avatar
        ? null
        : input.avatar_data_url !== undefined
        ? input.avatar_data_url
        : target.avatar_url;

      const next = staffList.map((s) =>
        s.id === staffId
          ? {
              ...s,
              full_name: input.full_name ? input.full_name.trim() : s.full_name,
              username: input.username ? normalizeUsername(input.username) : s.username,
              email: input.username ? toAuthEmail(input.username) : s.email,
              role: user.role === "admin" && input.role ? input.role : s.role,
              phone_wa: input.phone_wa !== undefined ? input.phone_wa?.trim() || null : s.phone_wa,
              wali_class: input.wali_class !== undefined ? input.wali_class : s.wali_class,
              is_active: user.role === "admin" && input.is_active !== undefined ? input.is_active : s.is_active,
              avatar_url: nextAvatar,
            }
          : s
      );
      setStaffList(next);
      const updatedUser = next.find((s) => s.id === user.id);
      if (updatedUser) setUser(updatedUser);
      persistDemo({ staffList: next });
      return { ok: true };
    },
    [user, mode, staffList, persistDemo, loadSupabaseData]
  );

  const deleteStaff = useCallback(
    async (staffId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      if (staffId === user.id) return { ok: false, error: "Tidak dapat menghapus akun Anda sendiri yang sedang login." };

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        const token = (await sb?.auth.getSession())?.data.session?.access_token || "";
        const resp = await fetch("/api/admin/staff", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: staffId }),
        });
        if (!resp.ok) {
          if (sb) {
            const { error } = await sb.from("staff_profiles").delete().eq("id", staffId);
            if (!error) {
              await loadSupabaseData(user);
              return { ok: true };
            }
          }
          const data = await resp.json().catch(() => ({}));
          return { ok: false, error: data.error || "Gagal menghapus akun guru." };
        }
        await loadSupabaseData(user);
        return { ok: true };
      }

      const next = staffList.filter((s) => s.id !== staffId);
      setStaffList(next);
      persistDemo({ staffList: next });
      return { ok: true };
    },
    [user, mode, staffList, persistDemo, loadSupabaseData]
  );

  const resetStaffPassword = useCallback(
    async (staffId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      if (!newPassword || newPassword.length < 6) {
        return { ok: false, error: "Kata sandi baru minimal 6 karakter." };
      }

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        const token = (await sb?.auth.getSession())?.data.session?.access_token || "";
        const resp = await fetch("/api/admin/staff", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: staffId, newPassword }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return { ok: false, error: data.error || "Gagal mereset kata sandi." };
        return { ok: true };
      }

      return { ok: true };
    },
    [user, mode]
  );

  // === CLASSES (LONG-TERM ACADEMIC YEAR SUPPORT) ===
  const addClass = useCallback(
    async (input: CreateClassInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      const nameClean = input.name.trim();
      if (!nameClean) return { ok: false, error: "Nama kelas wajib diisi." };
      if (classes.some((c) => c.name.toLowerCase() === nameClean.toLowerCase())) {
        return { ok: false, error: "Nama kelas sudah ada." };
      }

      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        const { error } = await sb.from("classes").insert({
          name: nameClean,
          major: input.major,
          grade_level: input.grade_level,
          academic_year: input.academic_year.trim() || "2026/2027",
          wali_kelas_name: input.wali_kelas_name.trim() || "-",
        });
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }

      const newCls: SchoolClass = {
        id: `cls-${Date.now()}`,
        name: nameClean,
        major: input.major,
        grade_level: input.grade_level,
        academic_year: input.academic_year.trim() || "2026/2027",
        wali_kelas_name: input.wali_kelas_name.trim() || "-",
      };
      const next = [...classes, newCls];
      setClasses(next);
      persistDemo({ classes: next });
      return { ok: true };
    },
    [user, mode, classes, persistDemo, loadSupabaseData]
  );

  const addRule = useCallback(
    async (input: CreateRuleInput): Promise<{ ok: boolean; error?: string }> => {
      if (!user || user.role !== "admin") return { ok: false, error: "Khusus Admin/BK." };
      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return { ok: false, error: "Supabase error." };
        const { error } = await sb.from("rules").insert(input);
        if (error) return { ok: false, error: error.message };
        await loadSupabaseData(user);
        return { ok: true };
      }
      const nextRule: Rule = { id: `rule-${Date.now()}`, ...input, is_active: true };
      const next = [...rules, nextRule];
      setRules(next);
      persistDemo({ rules: next });
      return { ok: true };
    },
    [user, mode, rules, persistDemo, loadSupabaseData]
  );

  const toggleRuleActive = useCallback(
    async (ruleId: string) => {
      if (!user || user.role !== "admin") return;
      const target = rules.find((r) => r.id === ruleId);
      if (!target) return;
      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return;
        await sb.from("rules").update({ is_active: !target.is_active }).eq("id", ruleId);
        await loadSupabaseData(user);
        return;
      }
      const next = rules.map((r) => (r.id === ruleId ? { ...r, is_active: !r.is_active } : r));
      setRules(next);
      persistDemo({ rules: next });
    },
    [user, mode, rules, persistDemo, loadSupabaseData]
  );

  const logWarningIssued = useCallback(
    async (studentId: string, stage: number, actionType: string, scoreSnapshot: number, notes?: string) => {
      if (!user || user.role !== "admin") return;
      const nowIso = new Date().toISOString();
      if (mode === "supabase") {
        const sb = getSupabaseBrowserClient();
        if (!sb) return;
        await sb.from("warning_logs").insert({
          student_id: studentId,
          stage,
          action_type: actionType,
          score_snapshot: scoreSnapshot,
          notes: notes || null,
          issued_by: user.id,
          issued_by_name: user.full_name,
        });
        await loadSupabaseData(user);
        return;
      }
      const entry: WarningLog = {
        id: `warn-${Date.now()}`,
        student_id: studentId,
        stage,
        action_type: actionType,
        score_snapshot: scoreSnapshot,
        notes: notes || null,
        issued_by_name: user.full_name,
        issued_at: nowIso,
      };
      const next = [entry, ...warningLogs];
      setWarningLogs(next);
      persistDemo({ warningLogs: next });
    },
    [user, mode, warningLogs, persistDemo, loadSupabaseData]
  );

  const resetDemoData = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setClasses(SEED_CLASSES);
    setRawStudents(SEED_STUDENTS);
    setRules(SEED_RULES);
    setRecords(SEED_DEMO_RECORDS);
    setStaffList(SEED_STAFF);
    setWarningLogs(SEED_WARNING_LOGS);
  }, []);

  return (
    <AppContext.Provider
      value={{
        mode,
        loading,
        user,
        classes,
        students,
        rules,
        records,
        staffList,
        warningLogs,
        pendingCount,
        login,
        loginDemoAs,
        logout,
        searchPublicStudents,
        getPublicStudentByNisn,
        createPointRecord,
        verifyPointRecord,
        voidPointRecord,
        addStudent,
        updateStudent,
        deleteStudent,
        updateStudentAvatar,
        updateStudentPhone,
        importStudentsBulk,
        addStaff,
        updateStaff,
        deleteStaff,
        resetStaffPassword,
        addClass,
        addRule,
        toggleRuleActive,
        logWarningIssued,
        resetDemoData,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
