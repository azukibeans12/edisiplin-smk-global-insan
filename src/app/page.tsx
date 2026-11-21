"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useApp, type PublicSearchHit } from "@/lib/store";
import { getDisiplinStage } from "@/lib/disiplin";
import { Avatar } from "@/components/Avatar";

export default function HomePage() {
  const { user, searchPublicStudents } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cleaned = query.trim();
    if (cleaned.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const hits = await searchPublicStudents(cleaned);
      if (!cancelled) {
        setResults(hits);
        setSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchPublicStudents]);

  return (
    <div className="space-y-6">
      {/* Hero & Search-to-Reveal Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cek Poin &amp; Riwayat Kedisiplinan Siswa
          </h1>

          {user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition"
            >
              Buka Dashboard {user.role === "admin" ? "Admin / BK" : "Guru"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Masukkan 10-digit NISN atau minimal 3 huruf Nama Siswa (contoh: 0086315460 atau Abdul)..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
          />
        </div>
      </section>

      {/* Search Results Box (Shown only once a query of >= 3 chars is entered) */}
      {query.trim().length >= 3 && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {searching ? (
            <div className="p-8 text-center text-xs text-slate-500">Mencari data siswa...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <div className="text-sm font-bold text-slate-800">Siswa tidak ditemukan</div>
              <p className="text-xs text-slate-500">Pastikan 10-digit NISN atau ejaan nama siswa sudah benar.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Hasil Pencarian ({results.length} ditemukan)</span>
                <span className="text-slate-500">Klik nama siswa untuk melihat riwayat lengkap</span>
              </div>
              <div className="divide-y divide-slate-200">
                {results.map((s) => {
                  const st = getDisiplinStage(s.current_score, s.has_instant_out);
                  const badgeClass =
                    st.tone === "danger"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : st.tone === "warn"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";
                  return (
                    <Link
                      key={s.student_id}
                      href={`/siswa/${s.nisn}`}
                      className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-blue-50/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} src={s.avatar_url} size="md" />
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {s.full_name}{" "}
                            <span className="text-xs font-semibold text-slate-500">• {s.class_name}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            NISN: {s.nisn} • Wali Kelas: {s.wali_kelas_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                          {st.shortLabel}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900">{s.current_score} pt</span>
                        <ArrowRight className="w-4 h-4 text-blue-700" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
