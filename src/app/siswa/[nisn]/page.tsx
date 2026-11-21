"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Camera,
  ClipboardPlus,
  Pencil,
  Printer,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDateTimeID, getDisiplinStage } from "@/lib/disiplin";
import { compressImageFile } from "@/lib/image-compress";
import { Avatar } from "@/components/Avatar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { DisiplinProgress } from "@/components/DisiplinProgress";
import { EvidenceModal } from "@/components/EvidenceModal";
import { PrintSpModal } from "@/components/PrintSpModal";
import { RulesModal } from "@/components/RulesModal";
import type { PointRecord, StudentWithScore } from "@/types/database";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const nisn = String(params?.nisn || "");
  const { user, loading, classes, getPublicStudentByNisn, updateStudent, deleteStudent, updateStudentAvatar, voidPointRecord, warningLogs } = useApp();

  const [student, setStudent] = useState<StudentWithScore | null>(null);
  const [timeline, setTimeline] = useState<PointRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [evidenceRec, setEvidenceRec] = useState<PointRecord | null>(null);
  const [spOpen, setSpOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Student Modal (Admin only)
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNisn, setEditNisn] = useState("");
  const [editNis, setEditNis] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editGender, setEditGender] = useState<"L" | "P">("L");
  const [editPhone, setEditPhone] = useState("");
  const [editErr, setEditErr] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setFetching(true);
      const res = await getPublicStudentByNisn(nisn);
      if (!active) return;
      setStudent(res?.student || null);
      setTimeline(res?.records || []);
      setFetching(false);
    }
    if (!loading && nisn) load();
    return () => {
      active = false;
    };
  }, [nisn, loading, getPublicStudentByNisn]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    setUploadingAvatar(true);
    setAvatarNotice("");
    try {
      const { blob, dataUrl } = await compressImageFile(file, 480, 0.78);
      const res = await updateStudentAvatar(student.id, blob, dataUrl);
      if (res.ok) {
        setStudent((prev) => (prev ? { ...prev, avatar_url: dataUrl } : prev));
        setAvatarNotice("Foto profil berhasil diperbarui.");
      } else {
        setAvatarNotice(res.error || "Gagal menyimpan foto.");
      }
    } catch (err) {
      setAvatarNotice(err instanceof Error ? err.message : "Gagal memproses foto.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleResetAvatar = async () => {
    if (!student) return;
    setUploadingAvatar(true);
    const res = await updateStudentAvatar(student.id, null, null);
    if (res.ok) {
      setStudent((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      setAvatarNotice("Foto dikembalikan ke placeholder.");
    }
    setUploadingAvatar(false);
  };

  const openEdit = () => {
    if (!student) return;
    setEditName(student.full_name);
    setEditNisn(student.nisn);
    setEditNis(student.nis || "");
    setEditClassId(student.class_id);
    setEditGender(student.gender);
    setEditPhone(student.parent_phone_wa || "");
    setEditErr("");
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const res = await updateStudent(student.id, {
      full_name: editName,
      nisn: editNisn,
      nis: editNis || null,
      class_id: editClassId,
      gender: editGender,
      parent_phone_wa: editPhone || null,
    });
    if (!res.ok) {
      setEditErr(res.error || "Gagal menyimpan.");
      return;
    }
    setEditOpen(false);
    if (editNisn.trim() !== student.nisn) {
      router.replace(`/siswa/${editNisn.trim()}`);
    }
  };

  const handleDeleteCurrentStudent = () => {
    setDeleteErr("");
    setDeleteOpen(true);
  };

  const confirmDeleteCurrentStudent = async () => {
    if (!student) return;
    setDeleting(true);
    setDeleteErr("");
    const res = await deleteStudent(student.id);
    setDeleting(false);
    if (!res.ok) {
      setDeleteErr(res.error || "Gagal menghapus siswa.");
      return;
    }
    setDeleteOpen(false);
    setEditOpen(false);
    router.replace("/siswa");
  };

  const handleVoid = async (rec: PointRecord) => {
    const reason = window.prompt("Masukkan alasan pembatalan (Void) untuk jejak audit:", "Kesalahan input / banding disetujui");
    if (!reason) return;
    await voidPointRecord(rec.id, reason);
  };

  if (loading || fetching) {
    return <div className="p-10 text-center text-sm text-slate-500">Memuat profil siswa...</div>;
  }

  if (!student) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-base font-bold text-slate-900">Siswa Tidak Ditemukan</h1>
        <p className="text-xs text-slate-500">Data siswa dengan NISN <code className="font-mono">{nisn}</code> tidak tersedia.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const stage = getDisiplinStage(student.current_score, student.has_instant_out);
  const isAdmin = user?.role === "admin";
  const isGuru = user?.role === "guru";
  const canEditPhoto = Boolean(isAdmin || isGuru);
  const approvedRecords = timeline.filter((r) => r.status === "approved");
  const studentWarnings = warningLogs.filter((w) => w.student_id === student.id);

  const badgeClass =
    stage.tone === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : stage.tone === "warn"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="space-y-5">
      <Link
        href={user ? "/siswa" : "/"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke {user ? "Daftar Siswa" : "Pencarian Siswa"}
      </Link>

      {/* Profile Header & 5-Stage Progress */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar
                name={student.full_name}
                src={student.avatar_url}
                size="xl"
                editable={canEditPhoto}
                onEditClick={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {canEditPhoto && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    {uploadingAvatar ? "Mengunggah..." : student.avatar_url ? "Ganti Foto" : "Tambah Foto"}
                  </button>
                  {student.avatar_url && (
                    <button
                      type="button"
                      onClick={handleResetAvatar}
                      className="text-[11px] text-slate-400 hover:text-rose-600"
                      title="Kembalikan ke placeholder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">{student.full_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                  {stage.fullLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                NISN: <span className="font-mono font-semibold text-slate-700">{student.nisn}</span>
                {student.nis ? ` • NIS: ${student.nis}` : ""} • Kelas:{" "}
                <strong className="text-slate-800">{student.class_name}</strong> • Wali Kelas:{" "}
                <strong className="text-slate-800">{student.wali_kelas_name}</strong>
              </p>
              <p className="text-xs text-slate-600">{stage.description}</p>
              {avatarNotice && <p className="text-xs font-semibold text-emerald-700">{avatarNotice}</p>}
            </div>
          </div>

          <div className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <div className="text-[11px] text-slate-500 font-medium">Akumulasi Poin Terverifikasi</div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {student.current_score}{" "}
              <span className="text-xs font-normal text-slate-400">/ 450</span>
            </div>
          </div>
        </div>

        <DisiplinProgress score={student.current_score} hasInstantOut={student.has_instant_out} />

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
          {isAdmin ? (
            <>
              <Link
                href={`/catat?mode=violation&nisn=${student.nisn}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
              >
                <ClipboardPlus className="w-3.5 h-3.5" /> + Catat Pelanggaran
              </Link>
              <Link
                href={`/catat?mode=redemption&nisn=${student.nisn}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                <Sparkles className="w-3.5 h-3.5" /> - Tebus / Prestasi
              </Link>
              <button
                onClick={() => setSpOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Surat / WA Ortu
              </button>
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Data Siswa
              </button>
            </>
          ) : isGuru ? (
            <>
              <Link
                href={`/catat?mode=violation&nisn=${student.nisn}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
              >
                <ClipboardPlus className="w-3.5 h-3.5" /> + Lapor Pelanggaran Siswa Ini
              </Link>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Camera className="w-3.5 h-3.5" /> Ganti Foto Profil
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRulesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
              >
                <BookOpen className="w-3.5 h-3.5" /> Lihat Tata Tertib &amp; Cara Tebus Poin
              </button>
              <span className="text-xs text-slate-500">
                Hanya menampilkan catatan yang sudah diverifikasi oleh Guru BK.
              </span>
            </>
          )}
        </div>
      </section>

      {/* Chronological Ledger */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Buku Perkembangan Digital (Riwayat Poin)</h2>
          <span className="text-xs text-slate-500">{timeline.length} catatan</span>
        </div>

        {timeline.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <div className="text-sm font-bold text-emerald-700">Belum Ada Catatan Pelanggaran</div>
            <p className="text-xs text-slate-500">Siswa dalam status tertib dan aman.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {timeline.map((rec) => {
              const isVoid = rec.status === "voided" || rec.status === "rejected";
              const isPending = rec.status === "pending";
              return (
                <div
                  key={rec.id}
                  className={`p-4 md:p-5 flex flex-wrap items-start justify-between gap-3 ${isVoid ? "opacity-55 bg-slate-50" : ""}`}
                >
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${
                          rec.record_type === "violation"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        } ${isVoid ? "line-through" : ""}`}
                      >
                        {rec.is_instant_out
                          ? "INSTANT OUT"
                          : rec.record_type === "violation"
                          ? `+${rec.points} pt`
                          : `-${rec.points} pt`}
                      </span>
                      <span className={`text-sm font-bold text-slate-900 ${isVoid ? "line-through" : ""}`}>
                        {rec.title_snapshot}
                      </span>
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          Menunggu Verifikasi BK
                        </span>
                      )}
                      {rec.status === "voided" && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                          Dibatalkan (Void)
                        </span>
                      )}
                      {rec.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold">
                          Ditolak BK
                        </span>
                      )}
                    </div>

                    {rec.notes && <p className="text-xs text-slate-600">{rec.notes}</p>}
                    {rec.status_reason && (
                      <p className="text-xs text-rose-700 font-medium">Alasan: {rec.status_reason}</p>
                    )}

                    <div className="text-[11px] text-slate-500">
                      {formatDateTimeID(rec.incident_at)} • Kategori: {rec.category_snapshot} • Pelapor:{" "}
                      <strong>{rec.reported_by_name}</strong>
                      {rec.verified_by_name ? ` • Verifikasi: ${rec.verified_by_name}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rec.evidence_url ? (
                      <button
                        onClick={() => setEvidenceRec(rec)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Camera className="w-3.5 h-3.5" /> Bukti Foto
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Tanpa foto</span>
                    )}

                    {isAdmin && rec.status === "approved" && (
                      <button
                        onClick={() => handleVoid(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-rose-700 hover:border-rose-200"
                        title="Batalkan catatan tanpa menghapus audit trail"
                      >
                        <Ban className="w-3.5 h-3.5" /> Void
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Warning / SP History (Staff Only) */}
      {user && studentWarnings.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 text-xs font-bold text-slate-900">
            Riwayat Surat Panggilan / SP yang Pernah Dicetak
          </div>
          <div className="divide-y divide-slate-200 text-xs">
            {studentWarnings.map((w) => (
              <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900">Proses {w.stage} — {w.action_type}</span>
                  <span className="text-slate-500 ml-2">(Skor saat cetak: {w.score_snapshot} pt)</span>
                </div>
                <span className="text-slate-500">{formatDateTimeID(w.issued_at)} • {w.issued_by_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Student Modal (Admin) */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <form onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Edit Data Siswa</h2>
              <button type="button" onClick={() => setEditOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap *</label>
                <input required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">NISN *</label>
                  <input required value={editNisn} onChange={(e) => setEditNisn(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">NIS</label>
                  <input value={editNis} onChange={(e) => setEditNis(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kelas</label>
                  <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jenis Kelamin</label>
                  <select value={editGender} onChange={(e) => setEditGender(e.target.value as "L" | "P")} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">No. WhatsApp Orang Tua</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="08..." className="w-full px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              {editErr && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 font-semibold">{editErr}</div>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDeleteCurrentStudent}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Siswa
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-3.5 py-2 rounded-lg border border-slate-300 font-semibold">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-bold">Simpan Perubahan</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {evidenceRec && <EvidenceModal record={evidenceRec} onClose={() => setEvidenceRec(null)} />}
      {spOpen && <PrintSpModal student={student} approvedRecords={approvedRecords} onClose={() => setSpOpen(false)} />}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {deleteOpen && (
        <ConfirmDeleteModal
          title="HAPUS SISWA?"
          targetName={student.full_name}
          targetSub={`NISN: ${student.nisn} • ${student.class_name}`}
          targetAvatar={student.avatar_url}
          variant="student"
          description="Data siswa beserta seluruh riwayat poin dan surat peringatannya akan dihapus permanen dan tidak bisa dikembalikan."
          tip='Jika siswa sudah lulus atau pindah dan ingin riwayat tetap tersimpan, cukup nonaktifkan status "Siswa Aktif" dari halaman Daftar Siswa.'
          loading={deleting}
          error={deleteErr}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={confirmDeleteCurrentStudent}
        />
      )}
    </div>
  );
}
