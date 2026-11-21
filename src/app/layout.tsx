import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "E-Disiplin — SMK Global Insan Tangerang",
  description: "Sistem Informasi Poin Disiplin & Pembinaan Siswa SMK Global Insan Tangerang (Berakhlak, Berilmu, Berprestasi).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AppProvider>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="no-print border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
            SMK Global Insan Tangerang • Religius • Disiplin • Berkarakter • Berprestasi • Berdaya Saing
          </footer>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
