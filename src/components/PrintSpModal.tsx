"use client";

import React, { useState } from "react";
import { MessageCircle, Printer, X } from "lucide-react";
import type { PointRecord, StudentWithScore } from "@/types/database";
import { buildWhatsAppLink, formatDateTimeID, getDisiplinStage } from "@/lib/disiplin";
import { useApp } from "@/lib/store";

interface Props {
  student: StudentWithScore;
  approvedRecords: PointRecord[];
  onClose: () => void;
}

export function PrintSpModal({ student, approvedRecords, onClose }: Props) {
  const { logWarningIssued, updateStudentPhone } = useApp();
  const stage = getDisiplinStage(student.current_score, student.has_instant_out);
  const [phone, setPhone] = useState(student.parent_phone_wa || "");
  const [savedNotice, setSavedNotice] = useState(false);

  const waUrl = buildWhatsAppLink(phone, student.full_name, student.class_name, student.current_score, stage.fullLabel);
  const todayStr = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const handlePrint = async () => {
    await logWarningIssued(
      student.id,
      Math.max(1, stage.stage),
      stage.shortLabel,
      student.current_score,
      `Dicetak surat panggilan (${stage.fullLabel})`
    );
    window.print();
  };

  const handleSavePhone = async () => {
    await updateStudentPhone(student.id, phone);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="no-print px-5 py-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-slate-900">Cetak Surat Panggilan / SP &amp; Kirim WhatsApp</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* WhatsApp Phone Helper (hidden on print) */}
          <div className="no-print p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <label className="font-semibold text-slate-700">No. WhatsApp Orang Tua:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
            <button onClick={handleSavePhone} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold hover:bg-slate-100">
              {savedNotice ? "✓ Tersimpan" : "Simpan No."}
            </button>
          </div>

          {/* Printable Letter Area */}
          <div className="print-sheet p-6 rounded-xl border border-slate-300 bg-white text-slate-900 space-y-4 text-xs leading-relaxed">
            <div className="flex items-center justify-center gap-4 border-b-2 border-slate-900 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-smk-global-insan.jpg"
                alt="Logo SMK Global Insan"
                className="w-16 h-16 object-contain shrink-0"
              />
              <div className="text-center">
                <div className="text-base font-extrabold tracking-wide">SMK GLOBAL INSAN TANGERANG</div>
                <div className="text-[11px] text-slate-600">Kecamatan Legok, Kabupaten Tangerang, Provinsi Banten</div>
                <div className="text-[11px] italic text-slate-600">&quot;Berakhlak, Berilmu, Berprestasi&quot;</div>
              </div>
            </div>

            <div className="text-center space-y-0.5">
              <div className="text-sm font-bold underline uppercase">
                {stage.stage >= 3 ? `SURAT PERINGATAN (${stage.shortLabel})` : "SURAT PANGGILAN ORANG TUA / WALI"}
              </div>
              <div className="text-[11px] text-slate-600">Tahapan Disiplin Positif: {stage.fullLabel}</div>
            </div>

            <p>Assalamu&apos;alaikum Wr. Wb. Kepada Yth. Bapak/Ibu Orang Tua/Wali Murid dari:</p>

            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 w-36 text-slate-600">Nama Siswa</td><td className="font-bold">: {student.full_name}</td></tr>
                <tr><td className="py-0.5 text-slate-600">NISN / Kelas</td><td className="font-semibold">: {student.nisn} / {student.class_name}</td></tr>
                <tr><td className="py-0.5 text-slate-600">Wali Kelas</td><td className="font-semibold">: {student.wali_kelas_name}</td></tr>
                <tr><td className="py-0.5 text-slate-600">Akumulasi Poin</td><td className="font-bold">: {student.current_score} Poin ({stage.fullLabel})</td></tr>
                <tr><td className="py-0.5 text-slate-600">Pembina</td><td className="font-semibold">: {stage.pembina}</td></tr>
              </tbody>
            </table>

            <p>
              Berdasarkan catatan buku perkembangan kedisiplinan SMK Global Insan Tangerang, ananda telah mencapai batas ambang <strong>{stage.fullLabel}</strong>. Berikut ringkasan catatan terbaru:
            </p>

            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1 text-left">Tanggal</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Keterangan</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Poin</th>
                </tr>
              </thead>
              <tbody>
                {approvedRecords.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td className="border border-slate-300 px-2 py-1">{formatDateTimeID(r.incident_at)}</td>
                    <td className="border border-slate-300 px-2 py-1">{r.title_snapshot}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                      {r.record_type === "violation" ? `+${r.points}` : `-${r.points}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p>
              Sehubungan dengan hal tersebut, kami mengharapkan kehadiran Bapak/Ibu di SMK Global Insan Tangerang untuk melakukan koordinasi dan pembinaan bersama demi kemajuan ananda. Wassalamu&apos;alaikum Wr. Wb.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6 text-center">
              <div>
                <div>Mengetahui,</div>
                <div>Wali Kelas {student.class_name}</div>
                <div className="h-16" />
                <div className="font-bold underline">{student.wali_kelas_name}</div>
              </div>
              <div>
                <div>Tangerang, {todayStr}</div>
                <div>Pembina ({stage.pembina})</div>
                <div className="h-16" />
                <div className="font-bold underline">( ________________________ )</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="no-print flex flex-wrap justify-end gap-2 pt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim via WhatsApp Ortu
            </a>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
