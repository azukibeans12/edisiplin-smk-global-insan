# E-Disiplin — SMK Global Insan Tangerang

Aplikasi web pelacakan poin kedisiplinan, pembinaan **Disiplin Positif (Proses 1–5)**, dan penebusan poin untuk **SMK Global Insan Tangerang** (Proyek RPL Universitas Gunadarma).

Dibangun dengan **Next.js (App Router)** + **Tailwind CSS** + **Supabase (PostgreSQL, Auth, Storage)** agar dapat di-hosting **gratis (Rp 0/bulan)** di **Vercel + Supabase**.

---

## Fitur Utama

1. **Beranda Publik (Search-to-Reveal untuk Siswa & Orang Tua):**
   - Tanpa perlu membuat akun siswa — orang tua/siswa cukup mengetik **10-digit NISN** atau **minimal 3 huruf nama** untuk melihat skor terverifikasi, progress 5 tahap Disiplin Positif, dan bukti foto/CCTV.
2. **Login Khusus Staff (`Admin / Guru BK` & `Guru`):**
   - Tombol **Login Guru / Admin** berada di pojok kanan atas.
3. **Antrean *"Menunggu Verifikasi BK"*:**
   - Laporan pelanggaran dari Guru masuk sebagai `pending` hingga disetujui atau ditolak oleh Admin/BK (mencegah kesalahan input & sengketa).
4. **Alasan Kustom & Upload Foto/CCTV Opsional:**
   - Selain memilih 52 aturan resmi dari banner *Tata Tertib Murid* & *Penebusan BK* (*Hafalan Juz 30*, *Kerja Bakti*, *Membantu Guru*, *Prestasi*, *Organisasi*), staf dapat memilih **Alasan Kustom** dengan poin tersendiri.
   - Lampiran foto/CCTV bersifat **opsional** dan otomatis dikompres di browser (< 250 KB).
5. **Cetak Surat Panggilan / SP1 / SP2 (PDF) + Kirim WhatsApp Ortu:**
   - Format surat resmi SMK Global Insan siap cetak/simpan PDF, ditambah tombol gratis kirim pesan via `wa.me`.
6. **Import CSV Dapodik & Manajemen Jangka Panjang (Siswa, Guru, Kelas & Foto Profil):**
   - Sudah terisi awal dengan **93 siswa unik** dari **7 Kelas Utama** (`XII TKJ`, `XI-TSM`, `XI-TKJ`, `XI-BC`, `X TSM`, `X TKJ`, `X-BC`).
   - Admin/BK dapat menambah & mengedit **Siswa** (termasuk status alumni/nonaktif), **Guru/Admin**, dan **Kelas baru** per tahun ajaran.
   - Setiap siswa & guru memiliki **foto profil placeholder** yang dapat langsung diunggah/diubah oleh Admin maupun Guru (otomatis terkompres di browser).

---

## Cara Menjalankan di Komputer Lokal (Langsung Jalan!)

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Tanpa file `.env.local`, aplikasi otomatis berjalan dalam **Mode Demo Lokal** (tersimpan di browser `localStorage`) sehingga semua fitur bisa langsung diuji.

---

## Menghubungkan ke Supabase Cloud Gratis (5 Menit)

1. Buat proyek gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** di Supabase, lalu jalankan isi file:
   - `supabase/migrations/001_init.sql` (membuat 6 tabel, view skor, RPC publik, RLS, dan bucket `evidence-photos`)
   - `supabase/seed.sql` (mengisi 7 kelas, 93 siswa Dapodik, dan 52 aturan *Tata Tertib* + *Penebusan*)
3. Buat akun Admin/BK dan Guru di Supabase **Authentication → Users**, lalu masukkan ID-nya ke tabel `public.staff_profiles` dengan `role = 'admin'` atau `'guru'`:
   ```sql
   INSERT INTO public.staff_profiles (id, full_name, email, role)
   VALUES ('<UUID-USER-DARI-AUTH>', 'Guru BK Global Insan', 'bk@smkglobalinsan.sch.id', 'admin');
   ```
4. Salin `.env.example` menjadi `.env.local` dan isi `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Deploy gratis ke [vercel.com](https://vercel.com) dari repository GitHub Anda dan masukkan dua variabel `.env` tersebut di Project Settings Vercel.
