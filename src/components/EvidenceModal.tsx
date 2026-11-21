"use client";

import React from "react";
import { X } from "lucide-react";
import type { PointRecord } from "@/types/database";
import { formatDateTimeID } from "@/lib/disiplin";

export function EvidenceModal({ record, onClose }: { record: PointRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-slate-900">Bukti Dokumentasi / CCTV</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {record.evidence_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.evidence_url}
              alt={record.title_snapshot}
              className="w-full max-h-[420px] object-contain rounded-xl border border-slate-200 bg-slate-950"
            />
          ) : (
            <div className="p-8 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
              Tidak ada lampiran gambar untuk catatan ini.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Keterangan</div>
              <div className="font-bold text-slate-900 mt-0.5">{record.title_snapshot}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Waktu &amp; Pelapor</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {formatDateTimeID(record.incident_at)} • {record.reported_by_name}
              </div>
            </div>
          </div>

          {record.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500">Kronologi / Catatan</div>
              <div className="text-slate-800 mt-0.5">{record.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
