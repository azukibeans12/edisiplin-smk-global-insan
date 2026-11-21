"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, ShieldCheck, UserCheck } from "lucide-react";
import { useApp } from "@/lib/store";

export default function LoginPage() {
  const { mode, login, loginDemoAs } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Gagal masuk.");
      return;
    }
    router.push("/dashboard");
  };

  const handleQuickDemo = (staffId: string) => {
    loginDemoAs(staffId);
    router.push("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto py-4 space-y-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Beranda Pencarian Siswa
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-700 text-white flex items-center justify-center font-extrabold text-lg">
            GI
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">Login Guru &amp; Admin / BK</h1>
          <p className="text-xs text-slate-500">
            Halaman ini khusus untuk tenaga pendidik SMK Global Insan Tangerang. Siswa &amp; Orang Tua cukup mencari langsung dari Beranda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Sekolah</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bk@smkglobalinsan.sch.id"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        {mode === "demo" && (
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 text-center">Login Cepat (Mode Demo Lokal)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("staff-bk")}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin / Guru BK
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("staff-avandi")}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-xs font-bold hover:bg-slate-100 transition"
              >
                <UserCheck className="w-4 h-4" />
                Guru (Pak Avandi)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
