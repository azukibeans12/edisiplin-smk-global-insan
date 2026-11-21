"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Clock, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { getDisiplinStage } from "@/lib/disiplin";
import { compressImageFile } from "@/lib/image-compress";
import type { RuleType } from "@/types/database";

function CatatFormInner() {
  const { user, loading, students, rules, createPointRecord } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode: RuleType = searchParams.get("mode") === "redemption" ? "redemption" : "violation";
  const initialNisn = searchParams.get("nisn") || "";

  const isAdmin = user?.role === "admin";
  const [recordType, setRecordType] = useState<RuleType>(isAdmin ? initialMode : "violation");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialNisn) {
      const found = students.find((s) => s.nisn === initialNisn);
      if (found) return found.id;
    }
    return students[0]?.id || "";
  });

  const activeRules = useMemo(
    () => rules.filter((r) => r.is_active && r.type === (isAdmin ? recordType : "violation")),
    [rules, recordType, isAdmin]
  );

  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customPoints, setCustomPoints] = useState<number>(15);
  const [notes, setNotes] = useState("");
  const [incidentAt, setIncidentAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const effectiveType: RuleType = isAdmin ? recordType : "violation";
  const effectiveRuleId = selectedRuleId || activeRules[0]?.id || "custom";
  const isCustom = effectiveRuleId === "custom";
  const chosenRule = isCustom ? null : activeRules.find((r) => r.id === effectiveRuleId) || activeRules[0] || null;

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.nisn.includes(q) || s.class_name.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const student = students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || students[0];

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Memuat formulir...</div>;
  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-base font-bold text-slate-900">Akses Khusus Guru &amp; Admin/BK</h1>
        <p className="text-xs text-slate-500">Login terlebih dahulu untuk mencatat pelanggaran atau penebusan poin.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">
          Login Sekarang
        </Link>
      </div>
    );
  }

  const deltaPoints = isCustom ? Math.max(0, Number(customPoints) || 0) : chosenRule?.points ?? 0;
  const isInstantOut = !isCustom && Boolean(chosenRule?.is_instant_out);
  const projectedScore = student
    ? isInstantOut
      ? 450
      : effectiveType === "violation"
      ? student.current_score + deltaPoints
      : Math.max(0, student.current_score - deltaPoints)
    : 0;

  const currentStage = getDisiplinStage(student?.current_score ?? 0, student?.has_instant_out);
  const nextStage = getDisiplinStage(projectedScore, isInstantOut || student?.has_instant_out);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, dataUrl } = await compressImageFile(file);
      setPhotoBlob(blob);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Gagal memproses gambar.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!student) {
      setFormError("Pilih siswa terlebih dahulu.");
      return;
    }
    if (isCustom && !customTitle.trim()) {
      setFormError("Nama alasan kustom wajib diisi.");
      return;
    }
    if (isCustom && deltaPoints <= 0) {
      setFormError("Jumlah poin kustom harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    const res = await createPointRecord({
      student_id: student.id,
      rule_id: isCustom ? null : chosenRule?.id || null,
      record_type: effectiveType,
      custom_title: isCustom ? customTitle.trim() : null,
      category_snapshot: isCustom
        ? effectiveType === "violation"
          ? "Alasan Kustom"
          : "Penebusan Kustom"
        : chosenRule?.category || "Umum",
      title_snapshot: isCustom ? customTitle.trim() : chosenRule?.title || "Catatan Poin",
      points: deltaPoints,
      is_instant_out: isInstantOut,
      notes: notes.trim() || null,
      evidence_file: photoBlob,
      evidence_data_url: photoPreview,
      incident_at: new Date(incidentAt).toISOString(),
    });
    setSubmitting(false);

    if (!res.ok) {
      setFormError(res.error || "Gagal menyimpan catatan.");
      return;
    }

    setSuccessMsg(
      isAdmin
        ? "Catatan berhasil disimpan dan langsung diterapkan ke skor siswa!"
        : "Laporan berhasil dikirim ke antrean Menunggu Verifikasi BK!"
    );
    setTimeout(() => {
      router.push(isAdmin ? `/siswa/${student.nisn}` : "/dashboard");
    }, 900);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {effectiveType === "violation" ? "Catat Pelanggaran Siswa" : "Catat Penebusan / Prestasi Siswa"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? "Input Admin/BK langsung berstatus Disetujui."
              : "Laporan Guru akan masuk ke antrean Menunggu Verifikasi BK sebelum memengaruhi skor."}
          </p>
        </div>

        {isAdmin ? (
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white">
            <button
              type="button"
              onClick={() => {
                setRecordType("violation");
                setSelectedRuleId("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                recordType === "violation" ? "bg-rose-600 text-white" : "text-slate-600"
              }`}
            >
              Pelanggaran (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordType("redemption");
                setSelectedRuleId("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                recordType === "redemption" ? "bg-emerald-600 text-white" : "text-slate-600"
              }`}
            >
              Tebus / Prestasi (-)
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            Masuk Verifikasi BK
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        {/* 1. Student Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">1. Pilih Siswa</label>
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Filter cepat: ketik nama, NISN, atau kelas (mis. XII TKJ)..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none text-xs"
          />
          <select
            value={student?.id || ""}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium"
          >
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} — {s.class_name} (NISN: {s.nisn} | Skor saat ini: {s.current_score})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Rule OR Custom Reason */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            2. Pilih {effectiveType === "violation" ? "Pelanggaran (Tata Tertib)" : "Penebusan BK / Prestasi / Organisasi"} atau Alasan Kustom
          </label>
          <select
            value={effectiveRuleId}
            onChange={(e) => setSelectedRuleId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium"
          >
            {activeRules.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.category}] {r.title} ({r.is_instant_out ? "INSTANT OUT" : effectiveType === "violation" ? `+${r.points} pt` : `-${r.points} pt`})
              </option>
            ))}
            <option value="custom">✏️ Lainnya — Tulis Alasan Kustom Sendiri...</option>
          </select>

          {isCustom && (
            <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 space-y-3">
              <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Mode Alasan Kustom (Lain-Lain)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alasan Kustom *</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={
                      effectiveType === "violation"
                        ? "Contoh: Bermain game di HP saat praktik lab"
                        : "Contoh: Membantu dokumentasi acara sekolah"
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAdmin ? "Jumlah Poin *" : "Usulan Poin *"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={450}
                    required
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold"
                  />
                </div>
              </div>
              {!isAdmin && (
                <p className="text-[11px] text-slate-600">
                  Guru BK dapat menyesuaikan jumlah poin kustom saat melakukan verifikasi.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live Score Projection */}
        {student && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Simulasi Skor {!isAdmin ? "(bila disetujui BK)" : ""}:</span>
              <span className="font-mono font-extrabold text-sm">
                {student.current_score} &rarr;{" "}
                <span className={effectiveType === "violation" ? "text-rose-600" : "text-emerald-600"}>
                  {isInstantOut ? "INSTANT OUT (450)" : projectedScore}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-600">Tahapan Disiplin Positif:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                  nextStage.tone === "danger"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : nextStage.tone === "warn"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {nextStage.fullLabel}
              </span>
            </div>
            {nextStage.stage > currentStage.stage && (
              <div className="flex items-center gap-1.5 text-rose-700 font-semibold pt-1">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                Siswa akan naik ke {nextStage.fullLabel} (Pembina: {nextStage.pembina}).
              </div>
            )}
          </div>
        )}

        {/* 3. Date & 4. Optional Evidence Photo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">3. Tanggal &amp; Waktu Kejadian</label>
            <input
              type="datetime-local"
              value={incidentAt}
              onChange={(e) => setIncidentAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              4. Foto Bukti / CCTV <span className="font-normal text-slate-500">(Opsional)</span>
            </label>
            <label className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs text-slate-600 transition">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Camera className="w-4 h-4 text-slate-500" />
                {photoPreview ? "Ganti Foto Bukti..." : "Upload / Ambil Foto..."}
              </span>
              <span className="text-[11px] font-mono text-slate-400">Auto-kompres</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
            {photoError && <p className="text-[11px] text-rose-600 mt-1">{photoError}</p>}
          </div>
        </div>

        {photoPreview && (
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Preview bukti" className="w-full max-h-56 object-contain" />
            <button
              type="button"
              onClick={() => {
                setPhotoBlob(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
            </button>
          </div>
        )}

        {/* 5. Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            5. Kronologi / Catatan Tambahan <span className="font-normal text-slate-500">(Opsional)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              effectiveType === "violation"
                ? "Tuliskan detail lokasi, saksi, atau referensi kamera CCTV..."
                : "Contoh: Setor hafalan QS. An-Naba ayat 1–40 dengan lancar di ruang BK..."
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none text-xs"
          />
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/dashboard" className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700">
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 ${
              effectiveType === "violation" ? "bg-blue-700 hover:bg-blue-800" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {submitting
              ? "Menyimpan..."
              : isAdmin
              ? "Simpan & Terapkan Poin"
              : "Kirim ke Verifikasi BK"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CatatPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Memuat formulir...</div>}>
      <CatatFormInner />
    </Suspense>
  );
}
