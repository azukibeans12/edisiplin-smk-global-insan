"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  Printer,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDateTimeID, getDisiplinStage } from "@/lib/disiplin";
import { compressImageFile } from "@/lib/image-compress";
import { Avatar } from "@/components/Avatar";
import { EvidenceModal } from "@/components/EvidenceModal";
import { PrintSpModal } from "@/components/PrintSpModal";
import type { PointRecord, StudentWithScore } from "@/types/database";

export default function DashboardPage() {
  const { user, loading, students, records, verifyPointRecord, updateStaff } = useApp();
  const [adminTab, setAdminTab] = useState<"verify" | "alerts">("verify");
  const [evidenceRec, setEvidenceRec] = useState<PointRecord | null>(null);
  const [spStudent, setSpStudent] = useState<StudentWithScore | null>(null);
  const [pointOverrides, setPointOverrides] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const guruFileRef = React.useRef<HTMLInputElement | null>(null);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const pendingRecords = useMemo(() => records.filter((r) => r.status === "pending"), [records]);
  const alertStudents = useMemo(
    () =>
      students
        .filter((s) => s.current_score >= 50 || s.has_instant_out)
        .sort((a, b) => (b.has_instant_out ? 999 : b.current_score) - (a.has_instant_out ? 999 : a.current_score)),
    [students]
  );

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Memuat dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-base font-bold text-slate-900">Akses Khusus Guru &amp; Admin/BK</h1>
        <p className="text-xs text-slate-500">Silakan login terlebih dahulu untuk membuka dashboard pengelolaan poin.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">
          Ke Halaman Login
        </Link>
      </div>
    );
  }

  const handleApprove = async (rec: PointRecord) => {
    setBusyId(rec.id);
    const pts = pointOverrides[rec.id] ?? rec.points;
    await verifyPointRecord(rec.id, "approved", pts);
    setBusyId(null);
  };

  const handleReject = async (rec: PointRecord) => {
    const reason = window.prompt("Alasan penolakan laporan ini (opsional):", "Data / bukti kurang lengkap");
    if (reason === null) return;
    setBusyId(rec.id);
    await verifyPointRecord(rec.id, "rejected", undefined, reason || "Ditolak oleh Guru BK");
    setBusyId(null);
  };

  // === GURU DASHBOARD ===
  if (user.role === "guru") {
    const myReports = records.filter((r) => r.reported_by === user.id || r.reported_by_name === user.full_name);
    const waliStudents = user.wali_class
      ? students.filter((s) => s.class_name === user.wali_class).sort((a, b) => b.current_score - a.current_score)
      : students.slice(0, 10);

    const handleGuruPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const { blob, dataUrl } = await compressImageFile(file, 480, 0.78);
        await updateStaff(user.id, { avatar_file: blob, avatar_data_url: dataUrl });
      } finally {
        e.target.value = "";
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <Avatar
              name={user.full_name}
              src={user.avatar_url}
              size="lg"
              variant="staff"
              editable
              onEditClick={() => guruFileRef.current?.click()}
            />
            <input ref={guruFileRef} type="file" accept="image/*" onChange={handleGuruPhoto} className="hidden" />
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Halo, {user.full_name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.wali_class ? `Wali Kelas ${user.wali_class}` : "Guru Mata Pelajaran"} • Klik ikon kamera pada foto untuk mengubah foto profil Anda.
              </p>
            </div>
          </div>
          <Link
            href="/catat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 shadow-xs transition"
          >
            <ClipboardPlus className="w-4 h-4" />
            + Lapor Pelanggaran Baru
          </Link>
        </div>

        {/* Status Laporan Guru */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Status Laporan yang Anda Kirim</h2>
            <span className="text-xs text-slate-500">{myReports.length} laporan</span>
          </div>
          {myReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Belum ada laporan yang Anda kirim.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {myReports.slice(0, 10).map((r) => {
                const stu = studentMap.get(r.student_id);
                const statusBadge =
                  r.status === "pending"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : r.status === "approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200";
                const statusText =
                  r.status === "pending"
                    ? "Menunggu Verifikasi BK"
                    : r.status === "approved"
                    ? "Disetujui BK"
                    : r.status === "rejected"
                    ? "Ditolak BK"
                    : "Dibatalkan (Void)";
                return (
                  <div key={r.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {stu?.full_name || "Siswa"}{" "}
                        <span className="font-normal text-slate-500">({stu?.class_name})</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {r.title_snapshot} • <span className="font-mono font-bold">+{r.points} pt</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTimeID(r.incident_at)}
                        {r.status_reason ? ` • Catatan BK: ${r.status_reason}` : ""}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Wali Kelas Watchlist */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {user.wali_class ? `Pantauan Siswa Kelas ${user.wali_class}` : "Pantauan Siswa"}
            </h2>
            <Link href="/siswa" className="text-xs font-semibold text-blue-700 hover:underline">
              Lihat Semua 93 Siswa &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {waliStudents.map((s) => {
              const st = getDisiplinStage(s.current_score, s.has_instant_out);
              const badge =
                st.tone === "danger"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : st.tone === "warn"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200";
              return (
                <Link key={s.id} href={`/siswa/${s.nisn}`} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.full_name} src={s.avatar_url} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{s.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.nisn}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge}`}>{st.shortLabel}</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{s.current_score} pt</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // === ADMIN / GURU BK DASHBOARD ===
  const spStudentsCount = alertStudents.filter((s) => s.current_score >= 200 || s.has_instant_out).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Dashboard Admin / Guru BK</h1>
          <p className="text-xs text-slate-500">Verifikasi laporan guru, kelola penebusan poin, dan tindak lanjuti ambang SP1/SP2.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/catat?mode=violation"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition"
          >
            <ClipboardPlus className="w-4 h-4" />
            + Catat Pelanggaran
          </Link>
          <Link
            href="/catat?mode=redemption"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
          >
            <Sparkles className="w-4 h-4" />
            - Tebus / Prestasi
          </Link>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setAdminTab("verify")}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 shadow-xs transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Menunggu Verifikasi BK</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{pendingRecords.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Laporan dari Guru</div>
        </button>

        <button
          onClick={() => setAdminTab("alerts")}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-300 shadow-xs transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Butuh SP1 / SP2 / OUT</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{spStudentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Skor &ge; 200 atau OUT</div>
        </button>

        <button
          onClick={() => setAdminTab("alerts")}
          className="text-left p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-xs transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pembinaan Proses 1–2</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{alertStudents.length - spStudentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Skor 50–199 poin</div>
        </button>

        <Link href="/siswa" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Siswa Aktif</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">7 Kelas Utama (TKJ, TSM, BC)</div>
        </Link>
      </div>

      {/* Main Queue Panel */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAdminTab("verify")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              adminTab === "verify" ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Antrean Verifikasi BK ({pendingRecords.length})
          </button>
          <button
            onClick={() => setAdminTab("alerts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              adminTab === "alerts" ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Antrean Disiplin Positif / SP ({alertStudents.length})
          </button>
        </div>

        {adminTab === "verify" ? (
          pendingRecords.length === 0 ? (
            <div className="p-10 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800">Semua Laporan Guru Sudah Diverifikasi!</div>
              <p className="text-xs text-slate-500">Tidak ada antrean yang menunggu tindakan BK saat ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {pendingRecords.map((rec) => {
                const stu = studentMap.get(rec.student_id);
                const editedPts = pointOverrides[rec.id] ?? rec.points;
                return (
                  <div key={rec.id} className="p-4 md:p-5 flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs font-bold">
                          {rec.is_instant_out ? "INSTANT OUT" : `+${editedPts} pt`}
                        </span>
                        <Link href={`/siswa/${stu?.nisn || ""}`} className="text-sm font-bold text-slate-900 hover:underline">
                          {stu?.full_name || "Siswa"} ({stu?.class_name})
                        </Link>
                        {!rec.rule_id && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                            Alasan Kustom
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-800">{rec.title_snapshot}</div>
                      {rec.notes && <p className="text-xs text-slate-600">{rec.notes}</p>}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span>{formatDateTimeID(rec.incident_at)}</span>
                        <span>Pelapor: <strong>{rec.reported_by_name}</strong></span>
                        {rec.evidence_url ? (
                          <button
                            onClick={() => setEvidenceRec(rec)}
                            className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                          >
                            <Camera className="w-3.5 h-3.5" /> Lihat Foto Bukti
                          </button>
                        ) : (
                          <span>Tanpa lampiran foto</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!rec.rule_id && !rec.is_instant_out && (
                        <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-slate-500">Poin:</span>
                          <input
                            type="number"
                            min={1}
                            max={450}
                            value={editedPts}
                            onChange={(e) =>
                              setPointOverrides((prev) => ({
                                ...prev,
                                [rec.id]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="w-14 px-1.5 py-0.5 rounded border border-slate-300 bg-white font-mono text-xs font-bold"
                          />
                        </div>
                      )}
                      <button
                        disabled={busyId === rec.id}
                        onClick={() => handleApprove(rec)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                      </button>
                      <button
                        disabled={busyId === rec.id}
                        onClick={() => handleReject(rec)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : alertStudents.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">Belum ada siswa yang menyentuh ambang &ge; 50 poin.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {alertStudents.map((s) => {
              const st = getDisiplinStage(s.current_score, s.has_instant_out);
              const badge =
                st.tone === "danger"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-800 border-amber-200";
              return (
                <div key={s.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name} src={s.avatar_url} size="md" />
                    <div>
                      <Link href={`/siswa/${s.nisn}`} className="text-sm font-bold text-slate-900 hover:underline">
                        {s.full_name} <span className="text-xs font-normal text-slate-500">• {s.class_name}</span>
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Pembina: <strong>{st.pembina}</strong> • Skor:{" "}
                        <span className="font-mono font-bold text-slate-800">{s.current_score}/450</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{st.fullLabel}</span>
                    <button
                      onClick={() => setSpStudent(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold hover:bg-slate-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> Surat / WA
                    </button>
                    <Link
                      href={`/siswa/${s.nisn}`}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {evidenceRec && <EvidenceModal record={evidenceRec} onClose={() => setEvidenceRec(null)} />}
      {spStudent && (
        <PrintSpModal
          student={spStudent}
          approvedRecords={records.filter((r) => r.student_id === spStudent.id && r.status === "approved")}
          onClose={() => setSpStudent(null)}
        />
      )}
    </div>
  );
}
