"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ClipboardPlus, LayoutDashboard, LogIn, LogOut, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { RulesModal } from "@/components/RulesModal";

export function Navbar() {
  const { user, mode, pendingCount, logout } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    router.push("/");
  };

  const navLinkClass = (href: string) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
      pathname === href
        ? "bg-blue-700 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <>
      {mode === "demo" && (
        <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-900">
          <span className="font-semibold">Mode Demo Lokal Aktif</span> — Data tersimpan di browser Anda (93 siswa &amp; aturan banner siap diuji). Isi <code className="bg-amber-100 px-1 rounded">.env.local</code> untuk menghubungkan ke Supabase Cloud.
        </div>
      )}

      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-smk-global-insan.jpg"
              alt="Logo SMK Global Insan Tangerang"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
            />
            <div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">E-Disiplin SMK Global Insan</div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {user ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    {user.role === "admin"
                      ? user.full_name.toLowerCase().includes("admin")
                        ? user.full_name
                        : `Admin / Guru BK • ${user.full_name}`
                      : `Guru • ${user.full_name}`}
                  </span>
                ) : (
                  "Tangerang • Berakhlak, Berilmu, Berprestasi"
                )}
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {user ? (
              <>
                <Link href="/dashboard" className={navLinkClass("/dashboard")}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                  {user.role === "admin" && pendingCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link href="/catat" className={navLinkClass("/catat")}>
                  <ClipboardPlus className="w-3.5 h-3.5" />
                  {user.role === "admin" ? "Catat / Tebus" : "Lapor Pelanggaran"}
                </Link>
                <Link href="/siswa" className={navLinkClass("/siswa")}>
                  <Users className="w-3.5 h-3.5" />
                  Siswa
                </Link>
                {user.role === "admin" && (
                  <Link href="/pengaturan" className={navLinkClass("/pengaturan")}>
                    <Settings className="w-3.5 h-3.5" />
                    Pengaturan
                  </Link>
                )}
                <button
                  onClick={() => setRulesOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Tata Tertib
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRulesOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Tata Tertib &amp; Penebusan
                </button>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login Guru / Admin
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={navLinkClass("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard {user.role === "admin" && pendingCount > 0 ? `(${pendingCount} Pending)` : ""}
                </Link>
                <Link href="/catat" onClick={() => setMobileOpen(false)} className={navLinkClass("/catat")}>
                  <ClipboardPlus className="w-4 h-4" /> {user.role === "admin" ? "Catat / Tebus Poin" : "Lapor Pelanggaran"}
                </Link>
                <Link href="/siswa" onClick={() => setMobileOpen(false)} className={navLinkClass("/siswa")}>
                  <Users className="w-4 h-4" /> Daftar 93 Siswa
                </Link>
                {user.role === "admin" && (
                  <Link href="/pengaturan" onClick={() => setMobileOpen(false)} className={navLinkClass("/pengaturan")}>
                    <Settings className="w-4 h-4" /> Master &amp; Pengaturan
                  </Link>
                )}
                <button
                  onClick={() => { setRulesOpen(true); setMobileOpen(false); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <BookOpen className="w-4 h-4" /> Tata Tertib
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setRulesOpen(true); setMobileOpen(false); }}
                  className="w-full py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  📖 Tata Tertib &amp; Cara Tebus Poin
                </button>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2 text-center rounded-lg bg-blue-700 text-white text-xs font-bold"
                >
                  Login Guru / Admin
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </>
  );
}
