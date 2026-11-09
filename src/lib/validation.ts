import type { QuestionPackage } from "@/types";

const OPTION_IDS = ["A", "B", "C", "D", "E"];
const EXPECTED = { TWK: 30, TIU: 35, TKP: 45 };
const RANGE = { TWK: [1, 30], TIU: [31, 65], TKP: [66, 110] } as const;

export interface PackageReport {
  packageId: string;
  total: number;
  counts: { TWK: number; TIU: number; TKP: number };
  withTable: number;
  withImage: number;
  errors: string[];
  manualReview: { id: string; reason: string }[];
  maxScore: number;
}

/**
 * Soal yang redaksinya merujuk sesuatu yang tidak tampak jelas di naskah sumber.
 * Teks tetap apa adanya (tidak boleh diubah); catatan ini untuk pemeriksaan manual.
 */
export function findSourceNotes(pkg: QuestionPackage): { id: string; reason: string }[] {
  const notes: { id: string; reason: string }[] = [];
  for (const q of pkg.questions) {
    const marked = q.blocks.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const hasItalic = /(^|[^*])\*[^*]+\*([^*]|$)/.test(marked);
    if (/bercetak miring|cetak miring/i.test(q.question) && !hasItalic) {
      notes.push({ id: q.id, reason: "Merujuk kata bercetak miring, tetapi PDF tidak memuat teks miring pada soal ini." });
    }
    if (/bercetak tebal|cetak tebal/i.test(q.question)) {
      const wholeLineBold = marked.split("\n").some((line) => /^\*\*[^*]+\*\*$/.test(line));
      if (wholeLineBold) {
        notes.push({ id: q.id, reason: "Merujuk bagian bercetak tebal, tetapi PDF menebalkan seluruh kalimat." });
      }
    }
    if (/\b(tabel|kolom|baris) berikut\b/i.test(q.question) && !q.blocks.some((b) => b.type === "table")) {
      notes.push({ id: q.id, reason: "Merujuk tabel, tetapi tidak ada tabel yang terekstrak." });
    }
    // Hanya rujukan ke gambar pada soal, bukan kata "gambar" dalam kalimat biasa.
    if (/\bgambar (berikut|di bawah|di atas|\(\d\))/i.test(q.question) && !q.blocks.some((b) => b.type === "image") && !q.options.some((o) => o.image)) {
      notes.push({ id: q.id, reason: "Merujuk gambar, tetapi tidak ada gambar yang terekstrak." });
    }
  }
  return notes;
}

/** Validasi struktural satu paket. Pure: dipakai oleh script laporan dan unit test. */
export function validatePackage(pkg: QuestionPackage): PackageReport {
  const errors: string[] = [];
  const manualReview: PackageReport["manualReview"] = [];
  const counts = { TWK: 0, TIU: 0, TKP: 0 };
  const seen = new Set<number>();
  let withTable = 0;
  let withImage = 0;
  let maxScore = 0;

  pkg.questions.forEach((q, index) => {
    const at = q.id;
    counts[q.category] += 1;
    if (seen.has(q.number)) errors.push(`${at}: nomor soal duplikat`);
    seen.add(q.number);
    if (q.number !== index + 1) errors.push(`${at}: urutan salah, posisi ${index + 1}`);
    const [low, high] = RANGE[q.category];
    if (q.number < low || q.number > high) errors.push(`${at}: nomor di luar rentang ${q.category}`);
    if (q.packageId !== pkg.id) errors.push(`${at}: packageId ${q.packageId} tidak cocok`);
    if (!q.blocks.length) errors.push(`${at}: isi soal kosong`);
    if (!q.question.trim()) errors.push(`${at}: teks soal kosong`);

    const ids = q.options.map((o) => o.id).join("");
    if (ids !== OPTION_IDS.join("")) errors.push(`${at}: opsi harus A-E, ditemukan "${ids}"`);
    for (const o of q.options) {
      if (!o.text.trim() && !o.image) errors.push(`${at}: opsi ${o.id} kosong`);
    }
    if (!q.explanation.trim()) errors.push(`${at}: pembahasan kosong`);

    if (q.category === "TKP") {
      if (q.correctAnswer !== null) errors.push(`${at}: TKP tidak boleh punya kunci tunggal`);
      const scores = q.optionScores;
      if (!scores) {
        errors.push(`${at}: bobot TKP tidak ada`);
      } else {
        const sorted = OPTION_IDS.map((id) => scores[id as keyof typeof scores]).sort();
        if (sorted.join() !== "1,2,3,4,5") errors.push(`${at}: bobot bukan permutasi 1-5 (${sorted})`);
      }
    } else {
      if (q.optionScores !== null) errors.push(`${at}: TWK/TIU tidak boleh punya bobot`);
      if (!q.correctAnswer || !OPTION_IDS.includes(q.correctAnswer)) {
        errors.push(`${at}: kunci jawaban tidak valid (${q.correctAnswer})`);
      }
    }
    maxScore += 5;

    if (q.blocks.some((b) => b.type === "table")) withTable += 1;
    if (q.blocks.some((b) => b.type === "image") || q.options.some((o) => o.image)) withImage += 1;
    for (const reason of q.reviewFlags) manualReview.push({ id: at, reason });
  });
  manualReview.push(...findSourceNotes(pkg));

  if (pkg.questions.length !== 110) errors.push(`Jumlah soal ${pkg.questions.length}, seharusnya 110`);
  (Object.keys(EXPECTED) as (keyof typeof EXPECTED)[]).forEach((c) => {
    if (counts[c] !== EXPECTED[c]) errors.push(`${c} berjumlah ${counts[c]}, seharusnya ${EXPECTED[c]}`);
  });
  if (maxScore !== 550) errors.push(`Skor maksimal ${maxScore}, seharusnya 550`);

  return { packageId: pkg.id, total: pkg.questions.length, counts, withTable, withImage, errors, manualReview, maxScore };
}
