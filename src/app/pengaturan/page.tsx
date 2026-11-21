"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Camera, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { DISIPLIN_STAGES } from "@/lib/disiplin";
import { compressImageFile } from "@/lib/image-compress";
import { Avatar } from "@/components/Avatar";
import type { GradeLevel, MajorType, RuleType, StaffProfile, StaffRole } from "@/types/database";

export default function PengaturanPage() {
  const {
    user,
    mode,
    loading,
    rules,
    staffList,
    classes,
    addRule,
    toggleRuleActive,
    addStaff,
    updateStaff,
    addClass,
    resetDemoData,
  } = useApp();

  const [tab, setTab] = useState<"staff" | "rules" | "stages">("staff");

  // New Rule Form
  const [rType, setRType] = useState<RuleType>("violation");
  const [rCat, setRCat] = useState("Lain-Lain");
  const [rTitle, setRTitle] = useState("");
  const [rPts, setRPts] = useState(15);
  const [rOut, setROut] = useState(false);

  // Add / Edit Teacher Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [sName, setSName] = useState("");
  const [sUsername, setSUsername] = useState("");
  const [sPassword, setSPassword] = useState("globalinsan123");
  const [sRole, setSRole] = useState<StaffRole>("guru");
  const [sPhone, setSPhone] = useState("");
  const [sWaliClass, setSWaliClass] = useState("");
  const [sActive, setSActive] = useState(true);
  const [sPhotoBlob, setSPhotoBlob] = useState<Blob | null>(null);
  const [sPhotoPreview, setSPhotoPreview] = useState<string | null>(null);
  const [sClearPhoto, setSClearPhoto] = useState(false);
  const [sErr, setSErr] = useState("");
  const [sSaving, setSSaving] = useState(false);

  // Add Class Form
  const [clsName, setClsName] = useState("");
  const [clsMajor, setClsMajor] = useState<MajorType>("TKJ");
  const [clsGrade, setClsGrade] = useState<GradeLevel>("X");
  const [clsYear, setClsYear] = useState("2026/2027");
  const [clsWali, setClsWali] = useState("");
  const [clsErr, setClsErr] = useState("");

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Memuat pengaturan...</div>;
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-base font-bold text-slate-900">Khusus Admin / Guru BK</h1>
        <p className="text-xs text-slate-500">Halaman master data hanya dapat diakses oleh akun Admin / Guru BK.</p>
        <Link href="/dashboard" className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const openAddStaff = () => {
    setEditingStaff(null);
    setSName("");
    setSUsername("");
    setSPassword("globalinsan123");
    setSRole("guru");
    setSPhone("");
    setSWaliClass("");
    setSActive(true);
    setSPhotoBlob(null);
    setSPhotoPreview(null);
    setSClearPhoto(false);
    setSErr("");
    setStaffModalOpen(true);
  };

  const openEditStaff = (st: StaffProfile) => {
    setEditingStaff(st);
    setSName(st.full_name);
    setSUsername(st.username);
    setSRole(st.role);
    setSPhone(st.phone_wa || "");
    setSWaliClass(st.wali_class || "");
    setSActive(st.is_active);
    setSPhotoBlob(null);
    setSPhotoPreview(st.avatar_url);
    setSClearPhoto(false);
    setSErr("");
    setStaffModalOpen(true);
  };

  const handleStaffPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, dataUrl } = await compressImageFile(file, 480, 0.78);
      setSPhotoBlob(blob);
      setSPhotoPreview(dataUrl);
      setSClearPhoto(false);
    } catch (err) {
      setSErr(err instanceof Error ? err.message : "Gagal memproses foto.");
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSErr("");
    setSSaving(true);

    if (editingStaff) {
      const res = await updateStaff(editingStaff.id, {
        full_name: sName,
        username: sUsername,
        role: sRole,
        phone_wa: sPhone || null,
        wali_class: sWaliClass || null,
        is_active: sActive,
        avatar_file: sPhotoBlob,
        avatar_data_url: sPhotoBlob ? sPhotoPreview : undefined,
        clear_avatar: sClearPhoto,
      });
      setSSaving(false);
      if (!res.ok) {
        setSErr(res.error || "Gagal memperbarui guru.");
        return;
      }
    } else {
      const res = await addStaff({
        full_name: sName,
        username: sUsername,
        password: sPassword,
        role: sRole,
        phone_wa: sPhone || null,
        wali_class: sWaliClass || null,
        avatar_file: sPhotoBlob,
        avatar_data_url: sPhotoPreview,
      });
      setSSaving(false);
      if (!res.ok) {
        setSErr(res.error || "Gagal menambahkan guru.");
        return;
      }
    }

    setStaffModalOpen(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClsErr("");
    const res = await addClass({
      name: clsName,
      major: clsMajor,
      grade_level: clsGrade,
      academic_year: clsYear,
      wali_kelas_name: clsWali || "-",
    });
    if (!res.ok) {
      setClsErr(res.error || "Gagal menambah kelas.");
      return;
    }
    setClsName("");
    setClsWali("");
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle.trim()) return;
    await addRule({
      type: rType,
      category: rCat.trim() || "Lain-Lain",
      title: rTitle.trim(),
      points: rOut ? 450 : Math.max(1, Number(rPts) || 10),
      is_instant_out: rType === "violation" && rOut,
    });
    setRTitle("");
    setROut(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Master Data &amp; Pengaturan</h1>
          <p className="text-xs text-slate-500">Tambah &amp; edit Guru/Admin, foto profil, kelas baru per tahun ajaran, dan aturan Tata Tertib.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white">
            <button onClick={() => setTab("staff")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "staff" ? "bg-blue-700 text-white" : "text-slate-600"}`}>
              Guru &amp; Kelas ({staffList.length})
            </button>
            <button onClick={() => setTab("rules")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "rules" ? "bg-blue-700 text-white" : "text-slate-600"}`}>
              Aturan ({rules.length})
            </button>
            <button onClick={() => setTab("stages")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "stages" ? "bg-blue-700 text-white" : "text-slate-600"}`}>
              Tahapan SP
            </button>
          </div>

          {mode === "demo" && (
            <button
              onClick={() => {
                if (window.confirm("Reset seluruh data demo kembali ke kondisi awal?")) resetDemoData();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: STAFF (TEACHERS / ADMIN) & CLASSES */}
      {tab === "staff" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Teachers & Admin List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" /> Daftar Guru &amp; Admin/BK
                </h2>
                <p className="text-xs text-slate-500">Tambah guru baru atau edit foto &amp; peran kapan saja.</p>
              </div>
              <button
                onClick={openAddStaff}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
              >
                <UserPlus className="w-4 h-4" /> + Tambah Guru / Admin
              </button>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className={`px-3.5 py-3 flex flex-wrap items-center justify-between gap-3 ${!st.is_active ? "opacity-50 bg-slate-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={st.full_name} src={st.avatar_url} size="md" variant="staff" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {st.full_name}
                        {!st.is_active && <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[10px]">Nonaktif</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">@{st.username}</span>
                        {st.wali_class ? ` • Wali: ${st.wali_class}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[11px] border ${
                        st.role === "admin"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {st.role === "admin" ? "Admin / BK" : "Guru"}
                    </span>
                    <button
                      onClick={() => openEditStaff(st)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classes / Rombel Management */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Kelas ({classes.length})</h2>
              <p className="text-xs text-slate-500">Tambahkan kelas baru untuk tahun ajaran berikutnya.</p>
            </div>

            <form onSubmit={handleAddClass} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="font-bold text-slate-800">+ Tambah Kelas Baru</div>
              <input
                required
                value={clsName}
                onChange={(e) => setClsName(e.target.value)}
                placeholder="Nama kelas (mis. XII TSM)"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={clsGrade} onChange={(e) => setClsGrade(e.target.value as GradeLevel)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
                <select value={clsMajor} onChange={(e) => setClsMajor(e.target.value as MajorType)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
                  <option value="TKJ">TKJ</option>
                  <option value="TSM">TSM</option>
                  <option value="BC">BC</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={clsYear}
                  onChange={(e) => setClsYear(e.target.value)}
                  placeholder="2026/2027"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                />
                <select value={clsWali} onChange={(e) => setClsWali(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
                  <option value="">Wali Kelas...</option>
                  {staffList.filter((s) => s.is_active).map((st) => (
                    <option key={st.id} value={st.full_name}>{st.full_name}</option>
                  ))}
                </select>
              </div>
              {clsErr && <div className="text-rose-700 font-semibold">{clsErr}</div>}
              <button type="submit" className="w-full py-1.5 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800">
                Simpan Kelas
              </button>
            </form>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {classes.map((c) => (
                <div key={c.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{c.name} <span className="font-normal text-slate-400">({c.academic_year})</span></div>
                    <div className="text-[11px] text-slate-500">Wali: {c.wali_kelas_name}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">{c.major}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULES */}
      {tab === "rules" && (
        <div className="space-y-4">
          <form onSubmit={handleAddRule} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" /> Tambah Aturan Pelanggaran / Penebusan Baru
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <select value={rType} onChange={(e) => setRType(e.target.value as RuleType)} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                <option value="violation">Pelanggaran (+)</option>
                <option value="redemption">Penebusan / Prestasi (-)</option>
              </select>
              <input value={rCat} onChange={(e) => setRCat(e.target.value)} placeholder="Kategori" className="px-3 py-2 rounded-lg border border-slate-300" />
              <input required value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Nama aturan / kegiatan..." className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-semibold">
                  Poin:
                  <input type="number" min={1} max={450} disabled={rOut} value={rPts} onChange={(e) => setRPts(Number(e.target.value))} className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold" />
                </label>
                {rType === "violation" && (
                  <label className="inline-flex items-center gap-1.5 text-rose-700 font-semibold cursor-pointer">
                    <input type="checkbox" checked={rOut} onChange={(e) => setROut(e.target.checked)} />
                    Instant OUT
                  </label>
                )}
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800">+ Simpan Aturan</button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-200 text-xs">
            {rules.map((r) => (
              <div key={r.id} className={`px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${!r.is_active ? "opacity-45 bg-slate-50" : ""}`}>
                <div>
                  <div className="font-bold text-slate-900">{r.title}</div>
                  <div className="text-[11px] text-slate-500">{r.category} • {r.type === "violation" ? "Pelanggaran" : "Penebusan / Penghargaan"}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold border ${r.type === "violation" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {r.is_instant_out ? "INSTANT OUT" : r.type === "violation" ? `+${r.points}` : `-${r.points}`}
                  </span>
                  <button onClick={() => toggleRuleActive(r.id)} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-600 hover:bg-slate-50">
                    {r.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STAGES */}
      {tab === "stages" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs text-xs">
          <h2 className="text-sm font-bold text-slate-900">5 Tahapan Disiplin Positif (Sesuai Banner Tata Tertib)</h2>
          <div className="space-y-2.5">
            {DISIPLIN_STAGES.map((st) => (
              <div key={st.stage} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Proses {st.stage} — Pembina: {st.pembina}</span>
                  <span className="font-mono font-bold px-2.5 py-0.5 rounded-md bg-white border border-slate-200">{st.range} poin</span>
                </div>
                <div className="text-slate-600">Ambang Panggilan: <span className="font-mono">{st.panggilan.join(" / ")}</span></div>
                <p className="text-slate-700">{st.process}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT TEACHER MODAL */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setStaffModalOpen(false)}>
          <form
            onSubmit={handleSaveStaff}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingStaff ? `Edit Guru / Staff — ${editingStaff.full_name}` : "Tambah Guru / Admin Baru"}
              </h2>
              <button type="button" onClick={() => setStaffModalOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>

            {/* Staff Photo Picker */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Avatar name={sName || "Guru Baru"} src={sPhotoPreview} size="lg" variant="staff" />
              <div className="space-y-1.5 flex-1">
                <div className="font-bold text-slate-800">Foto Profil Guru <span className="font-normal text-slate-500">(Opsional)</span></div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    {sPhotoPreview ? "Ganti Foto" : "Upload Foto"}
                    <input type="file" accept="image/*" onChange={handleStaffPhoto} className="hidden" />
                  </label>
                  {sPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setSPhotoBlob(null);
                        setSPhotoPreview(null);
                        setSClearPhoto(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 font-semibold text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Placeholder
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap *</label>
                <input required value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Contoh: Budi Santoso, S.Pd." className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Username Login * <span className="font-normal text-slate-500">(bebas tanpa perlu email asli)</span></label>
                <input
                  required
                  type="text"
                  autoCapitalize="none"
                  disabled={Boolean(editingStaff && mode === "supabase")}
                  value={sUsername}
                  onChange={(e) => setSUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                  placeholder="Contoh: pak.budi atau zuraida"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono disabled:bg-slate-100"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block font-semibold mb-1">Kata Sandi Awal *</label>
                  <input required minLength={6} value={sPassword} onChange={(e) => setSPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Peran (Role)</label>
                  <select value={sRole} onChange={(e) => setSRole(e.target.value as StaffRole)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="guru">Guru</option>
                    <option value="admin">Admin / Guru BK</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Wali Kelas (Opsional)</label>
                  <select value={sWaliClass} onChange={(e) => setSWaliClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="">Bukan Wali Kelas</option>
                    {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">No. HP / WhatsApp (Opsional)</label>
                <input value={sPhone} onChange={(e) => setSPhone(e.target.value)} placeholder="08..." className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>

              {editingStaff && (
                <label className="flex items-center gap-2 pt-1 font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={sActive} onChange={(e) => setSActive(e.target.checked)} />
                  Akun Aktif (hapus centang untuk menonaktifkan akses login)
                </label>
              )}

              {sErr && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 font-semibold">{sErr}</div>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setStaffModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 font-semibold">Batal</button>
              <button type="submit" disabled={sSaving} className="px-4 py-2 rounded-lg bg-blue-700 text-white font-bold disabled:opacity-50">
                {sSaving ? "Menyimpan..." : editingStaff ? "Simpan Perubahan" : "Tambah Guru"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
