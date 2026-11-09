/**
 * Laporan validasi seluruh paket. Pemakaian: npm run validate:data
 * Keluaran: data/reports/validation-report.{json,md}. Exit code 1 bila ada error.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validatePackage, type PackageReport } from "../src/lib/validation";
import { PACKAGE_IDS } from "../src/lib/question-loader";
import type { QuestionPackage } from "../src/types";

const root = process.cwd();
const reports: (PackageReport & { missingImages: string[] })[] = PACKAGE_IDS.map((id) => {
  const pkg = JSON.parse(
    readFileSync(join(root, "src/data/questions", `paket-${id.toLowerCase()}.json`), "utf8"),
  ) as QuestionPackage;
  const report = validatePackage(pkg);
  const srcs = pkg.questions.flatMap((q) => [
    ...q.blocks.flatMap((b) => (b.type === "image" ? [b.src] : [])),
    ...q.options.flatMap((o) => (o.image ? [o.image.src] : [])),
  ]);
  return { ...report, missingImages: srcs.filter((src) => !existsSync(join(root, "public", src))) };
});

const verificationPath = join(root, "data/reports/pdf-verification.json");
const verification: { package: string; wordsChecked: { soal: number; pembahasan: number }; issues: string[] }[] =
  existsSync(verificationPath) ? JSON.parse(readFileSync(verificationPath, "utf8")) : [];

const table = [
  "| Paket | Soal | TWK | TIU | TKP | Bertabel | Bergambar | Skor maks | Kata dicocokkan | Selisih teks | Gambar hilang | Error | Periksa manual |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...reports.map((r) => {
    const v = verification.find((x) => x.package === r.packageId);
    const words = v ? v.wordsChecked.soal + v.wordsChecked.pembahasan : "-";
    return `| ${r.packageId} | ${r.total} | ${r.counts.TWK} | ${r.counts.TIU} | ${r.counts.TKP} | ${r.withTable} | ${r.withImage} | ${r.maxScore} | ${words} | ${v ? v.issues.length : "-"} | ${r.missingImages.length} | ${r.errors.length} | ${r.manualReview.length} |`;
  }),
];
const problems = reports.flatMap((r) => [...r.errors, ...r.missingImages.map((m) => `${r.packageId}: gambar hilang ${m}`)]);
const review = reports.flatMap((r) => r.manualReview);
const lines = [
  "# Laporan Validasi Data Soal",
  "",
  "Dibuat oleh `npm run validate:data`. Pencocokan teks memakai `scripts/verify_against_pdf.py` (mesin pdftotext, berbeda dari extractor).",
  "",
  ...table,
  "",
  "## Error",
  "",
  ...(problems.length ? problems.map((p) => `- ${p}`) : ["Tidak ada."]),
  "",
  "## Perlu pemeriksaan manual",
  "",
  ...(review.length ? review.map((m) => `- ${m.id}: ${m.reason}`) : ["Tidak ada."]),
  "",
];

mkdirSync(join(root, "data/reports"), { recursive: true });
writeFileSync(join(root, "data/reports/validation-report.json"), JSON.stringify(reports, null, 2) + "\n");
writeFileSync(join(root, "data/reports/validation-report.md"), lines.join("\n"));
console.log(table.join("\n"));
console.log(`\nTotal soal: ${reports.reduce((s, r) => s + r.total, 0)} | Error: ${problems.length} | Periksa manual: ${review.length}`);
process.exit(problems.length ? 1 : 0);
