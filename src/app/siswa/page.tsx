"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { getDisiplinStage } from "@/lib/disiplin";
import { compressImageFile } from "@/lib/image-compress";
import { Avatar } from "@/components/Avatar";
import type { StudentWithScore } from "@/types/database";

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SiswaListPage() {
  const { user, loading, students, classes, addStudent, updateStudent, importStudentsBulk } = useApp();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [importResult, setImportResult] = useState("");

  // Add / Edit Student Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithScore | null>(null);
  const [formNisn, setFormNisn] = useState("");
  const [formNis, setFormNis] = useState("");
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState<"L" | "P">("L");
  const [formClassId, setFormClassId] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formPhotoBlob, setFormPhotoBlob] = useState<Blob | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (!showInactive && !s.is_active) return false;
        if (classFilter !== "ALL" && s.class_name !== classFilter) return false;
        if (stageFilter === "AMAN" && (s.current_score >= 50 || s.has_instant_out)) return false;
        if (stageFilter === "PEMBINAAN" && (s.current_score < 50 || s.current_score >= 200 || s.has_instant_out)) return false;
        if (stageFilter === "SP" && s.current_score < 200 && !s.has_instant_out) return false;
        if (q && !s.full_name.toLowerCase().includes(q) && !s.nisn.includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.current_score - a.current_score || a.full_name.localeCompare(b.full_name));
  }, [students, search, classFilter, stageFilter, showInactive]);

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Memuat data siswa...</div>;
  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-base font-bold text-slate-900">Direktori Lengkap Khusus Guru &amp; Admin</h1>
        <p className="text-xs text-slate-500">Untuk mencari siswa sebagai Tamu/Orang Tua, gunakan pencarian di Beranda.</p>
        <div className="flex justify-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold">Beranda</Link>
          <Link href="/login" className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">Login Staff</Link>
        </div>
      </div>
    );
  }

  const openAddModal = () => {
    setEditingStudent(null);
    setFormNisn("");
    setFormNis("");
    setFormName("");
    setFormGender("L");
    setFormClassId(classes[0]?.id || "");
    setFormPhone("");
    setFormActive(true);
    setFormPhotoBlob(null);
    setFormPhotoPreview(null);
    setClearPhoto(false);
    setFormErr("");
    setModalOpen(true);
  };

  const openEditModal = (s: StudentWithScore) => {
    setEditingStudent(s);
    setFormNisn(s.nisn);
    setFormNis(s.nis || "");
    setFormName(s.full_name);
    setFormGender(s.gender);
    setFormClassId(s.class_id);
    setFormPhone(s.parent_phone_wa || "");
    setFormActive(s.is_active);
    setFormPhotoBlob(null);
    setFormPhotoPreview(s.avatar_url);
    setClearPhoto(false);
    setFormErr("");
    setModalOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, dataUrl } = await compressImageFile(file, 480, 0.78);
      setFormPhotoBlob(blob);
      setFormPhotoPreview(dataUrl);
      setClearPhoto(false);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Gagal memproses foto.");
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setSaving(true);

    if (editingStudent) {
      const res = await updateStudent(editingStudent.id, {
        nisn: formNisn,
        nis: formNis || null,
        full_name: formName,
        gender: formGender,
        class_id: formClassId || classes[0]?.id,
        parent_phone_wa: formPhone || null,
        is_active: formActive,
        avatar_file: formPhotoBlob,
        avatar_data_url: formPhotoBlob ? formPhotoPreview : undefined,
        clear_avatar: clearPhoto,
      });
      setSaving(false);
      if (!res.ok) {
        setFormErr(res.error || "Gagal menyimpan perubahan.");
        return;
      }
    } else {
      const res = await addStudent({
        nisn: formNisn,
        nis: formNis || null,
        full_name: formName,
        gender: formGender,
        class_id: formClassId || classes[0]?.id,
        parent_phone_wa: formPhone || null,
        avatar_file: formPhotoBlob,
        avatar_data_url: formPhotoPreview,
      });
      setSaving(false);
      if (!res.ok) {
        setFormErr(res.error || "Gagal menambah siswa.");
        return;
      }
    }

    setModalOpen(false);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    let currentClassId: string | null = null;
    let isKelasUtama = true;
    const toImport: { nisn: string; nis: string | null; full_name: string; gender: "L" | "P"; class_id: string; parent_phone_wa: null }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.includes("Jenis Rombel:")) {
        isKelasUtama = line.includes("Kelas Utama");
        const match = line.match(/Nama Rombel:\s*([^,-]+)/i);
        if (match) {
          const rombelName = match[1].trim().toLowerCase();
          const foundCls = classes.find((c) => c.name.toLowerCase() === rombelName);
          currentClassId = foundCls?.id || null;
        }
        continue;
      }

      if (!isKelasUtama) continue;
      const cols = line.split(",").map((c) => c.trim());
      if (cols.length >= 4 && /^\d+(\.0)?$/.test(cols[0]) && cols[1].includes("/")) {
        const [nisnRaw, nisRaw] = cols[1].split("/").map((x) => x.trim());
        const name = toTitleCase(cols[2]);
        const gender = cols[3].toUpperCase() === "P" ? "P" : "L";
        if (nisnRaw && name && (currentClassId || classes[0]?.id)) {
          toImport.push({
            nisn: nisnRaw,
            nis: nisRaw || null,
            full_name: name,
            gender,
            class_id: currentClassId || classes[0].id,
            parent_phone_wa: null,
          });
        }
      }
    }

    const res = await importStudentsBulk(toImport);
    setImportResult(`Import selesai: ${res.added} siswa baru ditambahkan, ${res.skipped} sudah ada / dilewati.`);
    e.target.value = "";
  };

  const activeTotal = students.filter((s) => s.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Daftar Siswa ({activeTotal} Aktif)</h1>
          <p className="text-xs text-slate-500">Kelola siswa lintas tahun ajaran — foto placeholder otomatis siap diganti oleh Admin/Guru.</p>
        </div>
        {user.role === "admin" && (
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import CSV Dapodik
              <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
            </label>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      {importResult && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{importResult}</span>
          <button onClick={() => setImportResult("")} className="text-emerald-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NISN siswa..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs outline-none"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>{c.name} — {c.wali_kelas_name}</option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">Semua Status</option>
          <option value="SP">Butuh SP1 / SP2 / OUT (&ge;200)</option>
          <option value="PEMBINAAN">Pembinaan Wali / BK (50–199)</option>
          <option value="AMAN">Tertib / Aman (&lt;50)</option>
        </select>

        {user.role === "admin" && (
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-1">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Tampilkan Alumni/Nonaktif
          </label>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Siswa / NISN</th>
                <th className="px-4 py-3 font-semibold">Kelas</th>
                <th className="px-4 py-3 font-semibold">Wali Kelas</th>
                <th className="px-4 py-3 font-semibold text-right">Skor</th>
                <th className="px-4 py-3 font-semibold">Tahapan</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((s) => {
                const st = getDisiplinStage(s.current_score, s.has_instant_out);
                const badge =
                  st.tone === "danger"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : st.tone === "warn"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition ${!s.is_active ? "opacity-55 bg-slate-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.full_name} src={s.avatar_url} size="sm" />
                        <div>
                          <Link href={`/siswa/${s.nisn}`} className="font-bold text-slate-900 hover:text-blue-700">
                            {s.full_name}
                            {!s.is_active && <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[10px]">Nonaktif</span>}
                          </Link>
                          <div className="text-[11px] font-mono text-slate-500">{s.nisn} • {s.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.class_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.wali_kelas_name}</td>
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">{s.current_score}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge}`}>
                        {st.shortLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {user.role === "admin" && (
                          <button
                            onClick={() => openEditModal(s)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:border-blue-200 font-semibold"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <Link href={`/siswa/${s.nisn}`} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                          Detail <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={handleSaveStudent}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingStudent ? `Edit Siswa — ${editingStudent.full_name}` : "Tambah Siswa Baru"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>

            {/* Profile Photo Picker */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Avatar name={formName || "Siswa Baru"} src={formPhotoPreview} size="lg" />
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-bold text-slate-800">Foto Profil Siswa <span className="font-normal text-slate-500">(Opsional)</span></div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    {formPhotoPreview ? "Ganti Foto" : "Upload Foto"}
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                  {formPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormPhotoBlob(null);
                        setFormPhotoPreview(null);
                        setClearPhoto(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Placeholder
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">NISN (10 Digit) *</label>
                <input required value={formNisn} onChange={(e) => setFormNisn(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap *</label>
                <input required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kelas *</label>
                  <select value={formClassId} onChange={(e) => setFormClassId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jenis Kelamin</label>
                  <select value={formGender} onChange={(e) => setFormGender(e.target.value as "L" | "P")} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">NIS (Opsional)</label>
                  <input value={formNis} onChange={(e) => setFormNis(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">WA Orang Tua (Opsional)</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="08..." className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                </div>
              </div>

              {editingStudent && (
                <label className="flex items-center gap-2 pt-1 font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                  Siswa Aktif (hapus centang jika sudah lulus / pindah)
                </label>
              )}

              {formErr && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 font-semibold">{formErr}</div>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold">Batal</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold disabled:opacity-50">
                {saving ? "Menyimpan..." : editingStudent ? "Simpan Perubahan" : "Simpan Siswa"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
