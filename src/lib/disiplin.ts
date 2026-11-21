export interface DisiplinStage {
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  shortLabel: string;
  fullLabel: string;
  panggilanLabel: string;
  pembina: string;
  description: string;
  tone: "ok" | "warn" | "danger";
  minScore: number;
}

export const DISIPLIN_STAGES = [
  {
    stage: 1 as const,
    range: "50–100",
    min: 50,
    shortLabel: "Wali Kelas",
    pembina: "Wali Kelas",
    panggilan: [50, 75, 100],
    process: "Murid dipanggil, diberikan poin, dan dicatat dalam buku perkembangan murid.",
  },
  {
    stage: 2 as const,
    range: "125–175",
    min: 125,
    shortLabel: "Guru BK",
    pembina: "Bimbingan Konseling",
    panggilan: [125, 150, 175],
    process: "Dipanggil orang tua bersama murid untuk mendapatkan informasi mengenai disiplin.",
  },
  {
    stage: 3 as const,
    range: "200–250",
    min: 200,
    shortLabel: "SP 1",
    pembina: "Wakasek Kesiswaan",
    panggilan: [200, 225, 250],
    process: "Dipanggil orang tua bersama murid untuk diberikan Surat Peringatan 1 (SP 1).",
  },
  {
    stage: 4 as const,
    range: "300–350",
    min: 300,
    shortLabel: "SP 2",
    pembina: "Kepala Sekolah",
    panggilan: [300, 325, 350],
    process: "Dipanggil orang tua bersama murid untuk diberikan Surat Peringatan 2 (SP 2).",
  },
  {
    stage: 5 as const,
    range: "375–450",
    min: 375,
    shortLabel: "Dewan Guru",
    pembina: "Rapat Dewan Guru",
    panggilan: [375, 400, 425, 450],
    process: "Rapat Dewan Guru I–III hingga Rapat Terakhir (450): dikembalikan ke orang tua / dikeluarkan.",
  },
];

export function getDisiplinStage(score: number, hasInstantOut = false): DisiplinStage {
  if (hasInstantOut) {
    return {
      stage: 5,
      shortLabel: "INSTANT OUT",
      fullLabel: "Pelanggaran Berat — Instant OUT",
      panggilanLabel: "Rapat Terakhir / Dikeluarkan",
      pembina: "Kepala Sekolah & Dewan Guru",
      description: "Pelanggaran berat tanpa toleransi (Narkoba/Miras/LGBT/Sex Bebas).",
      tone: "danger",
      minScore: 450,
    };
  }
  if (score >= 450) {
    return {
      stage: 5,
      shortLabel: "OUT (450)",
      fullLabel: "Proses 5 — Rapat Terakhir (Dikeluarkan)",
      panggilanLabel: "Panggilan Terakhir (450)",
      pembina: "Rapat Dewan Guru",
      description: "Dikembalikan ke orang tua / dikeluarkan dari sekolah.",
      tone: "danger",
      minScore: 450,
    };
  }
  if (score >= 375) {
    const sub = score >= 425 ? "Rapat Dewan Guru III" : score >= 400 ? "Rapat Dewan Guru II" : "Rapat Dewan Guru I";
    return {
      stage: 5,
      shortLabel: "Dewan Guru",
      fullLabel: `Proses 5 — ${sub}`,
      panggilanLabel: sub,
      pembina: "Rapat Dewan Guru",
      description: "Pembinaan tingkat akhir melalui Rapat Dewan Guru.",
      tone: "danger",
      minScore: 375,
    };
  }
  if (score >= 300) {
    const sub = score >= 350 ? "Panggilan III (SP 2)" : score >= 325 ? "Panggilan II (SP 2)" : "Panggilan I (SP 2)";
    return {
      stage: 4,
      shortLabel: "SP 2",
      fullLabel: `Proses 4 — Surat Peringatan 2 (${sub})`,
      panggilanLabel: sub,
      pembina: "Kepala Sekolah",
      description: "Dipanggil orang tua bersama murid untuk diberikan Surat Peringatan 2 (SP 2).",
      tone: "danger",
      minScore: 300,
    };
  }
  if (score >= 200) {
    const sub = score >= 250 ? "Panggilan III (SP 1)" : score >= 225 ? "Panggilan II (SP 1)" : "Panggilan I (SP 1)";
    return {
      stage: 3,
      shortLabel: "SP 1",
      fullLabel: `Proses 3 — Surat Peringatan 1 (${sub})`,
      panggilanLabel: sub,
      pembina: "Wakasek Kesiswaan",
      description: "Dipanggil orang tua bersama murid untuk diberikan Surat Peringatan 1 (SP 1).",
      tone: "danger",
      minScore: 200,
    };
  }
  if (score >= 125) {
    const sub = score >= 175 ? "Panggilan III" : score >= 150 ? "Panggilan II" : "Panggilan I";
    return {
      stage: 2,
      shortLabel: "Panggilan BK",
      fullLabel: `Proses 2 — Bimbingan Konseling (${sub})`,
      panggilanLabel: sub,
      pembina: "Bimbingan Konseling",
      description: "Dipanggil orang tua bersama murid untuk mendapatkan informasi mengenai disiplin.",
      tone: "warn",
      minScore: 125,
    };
  }
  if (score >= 50) {
    const sub = score >= 100 ? "Panggilan III" : score >= 75 ? "Panggilan II" : "Panggilan I";
    return {
      stage: 1,
      shortLabel: "Wali Kelas",
      fullLabel: `Proses 1 — Pembinaan Wali Kelas (${sub})`,
      panggilanLabel: sub,
      pembina: "Wali Kelas",
      description: "Murid dipanggil, diberikan poin, dan dicatat dalam buku perkembangan murid.",
      tone: "warn",
      minScore: 50,
    };
  }
  return {
    stage: 0,
    shortLabel: "Aman",
    fullLabel: "Tertib / Aman",
    panggilanLabel: "Tidak ada panggilan",
    pembina: "-",
    description: "Siswa dalam kategori tertib (poin di bawah 50).",
    tone: "ok",
    minScore: 0,
  };
}

export function buildWhatsAppLink(phone: string | null | undefined, studentName: string, className: string, score: number, stageLabel: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : digits ? "62" + digits : "";
  const message = `Assalamu'alaikum Wr. Wb. Bapak/Ibu Orang Tua/Wali dari *${studentName}* (Kelas *${className}*).\n\nKami dari BK SMK Global Insan Tangerang menginformasikan bahwa akumulasi poin kedisiplinan ananda saat ini adalah *${score} poin* (*${stageLabel}*).\n\nMohon kehadiran Bapak/Ibu di sekolah untuk pembinaan bersama demi kebaikan ananda. Terima kasih.\n\n_SMK Global Insan Tangerang — Berakhlak, Berilmu, Berprestasi_`;
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function formatDateTimeID(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
