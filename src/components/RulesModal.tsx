"use client";

import React, { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { DISIPLIN_STAGES } from "@/lib/disiplin";

export function RulesModal({ onClose }: { onClose: () => void }) {
  const { rules } = useApp();
  const [tab, setTab] = useState<"violation" | "redemption" | "stages">("redemption");
  const [search, setSearch] = useState("");

  const activeRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter(
      (r) =>
        r.is_active &&
        r.type === tab &&
        (!q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    );
  }, [rules, tab, search]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Tata Tertib Murid &amp; Cara Penebusan Poin</h2>
            <p className="text-xs text-slate-500">SMK Global Insan Tangerang — Referensi Resmi Sekolah</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white">
            <button onClick={() => setTab("redemption")} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${tab === "redemption" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
              Penebusan &amp; Prestasi (-)
            </button>
            <button onClick={() => setTab("violation")} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${tab === "violation" ? "bg-rose-600 text-white" : "text-slate-600"}`}>
              Pelanggaran (+)
            </button>
            <button onClick={() => setTab("stages")} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${tab === "stages" ? "bg-blue-700 text-white" : "text-slate-600"}`}>
              5 Tahap Disiplin
            </button>
          </div>

          {tab !== "stages" && (
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari aturan..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto space-y-3 text-xs">
          {tab === "redemption" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <strong>Cara Menebus Poin Pelanggaran:</strong> Siswa dapat mengurangi akumulasi poin melalui <strong>Hafalan Al-Quran Juz 30</strong>, <strong>Kerja Bakti</strong>, <strong>Membantu Guru</strong>, keaktifan <strong>OSIS/Pengurus Kelas</strong>, atau meraih <strong>Prestasi Lomba</strong> (dicatat oleh Guru BK).
            </div>
          )}

          {tab === "stages" ? (
            <div className="space-y-2.5">
              {DISIPLIN_STAGES.map((st) => (
                <div key={st.stage} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Proses {st.stage} — Pembina: {st.pembina}</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200">{st.range} poin</span>
                  </div>
                  <div className="text-slate-600">Ambang Panggilan: <span className="font-mono">{st.panggilan.join(" / ")}</span></div>
                  <p className="text-slate-700">{st.process}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {activeRules.length === 0 ? (
                <div className="p-6 text-center text-slate-500">Aturan tidak ditemukan.</div>
              ) : (
                activeRules.map((r) => (
                  <div key={r.id} className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <div className="text-[11px] text-slate-500">{r.category}</div>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-md font-mono font-bold ${
                        r.type === "violation"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {r.is_instant_out ? "INSTANT OUT" : r.type === "violation" ? `+${r.points}` : `-${r.points}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
