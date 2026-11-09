# CAT CPNS 2027

Platform latihan soal dan simulasi CAT untuk SKD CPNS: 10 paket, 1.100 soal TWK, TIU, dan TKP dengan kunci jawaban, pembahasan, dan penilaian otomatis.

Berjalan sepenuhnya di browser. Tidak memerlukan login, database, API key, atau environment variable. Progres tersimpan di `localStorage`.

## Instalasi

Membutuhkan Node.js 20.9 atau lebih baru.

```bash
npm install
```

## Menjalankan

```bash
npm run dev        # server development di http://localhost:3000
npm run build      # build production
npm run start      # menjalankan hasil build
npm test           # unit test (scoring, timer, progres, dan data 10 paket)
npm run typecheck
npm run lint
npm run validate:data   # laporan validasi di data/reports/
```

## Struktur project

```
data/
  source-pdfs/          PDF sumber (tidak dibutuhkan saat runtime)
  reports/              laporan validasi dan verifikasi data
scripts/
  extract_questions.py  PDF -> JSON + gambar soal
  verify_against_pdf.py pencocokan JSON dengan PDF memakai mesin lain (pdftotext)
  validate-questions.ts laporan validasi
public/images/questions/ gambar soal figural hasil potongan PDF
src/
  app/                  halaman; (site) memakai navbar, (session) untuk layar pengerjaan
  components/           UI per fitur (exam, practice, results, dashboard, questions, charts, ui)
  data/questions/       paket-s1.json ... paket-s10.json
  hooks/                usePackage, useHydrated, useQuestionTimer
  lib/                  logika murni: scoring, timer, attempt, stats, storage, validation, question-loader
  stores/               progres pengguna (Zustand + localStorage)
  types/                tipe data
tests/                  unit test
```

## Struktur data soal

Satu file per paket berisi `{ id, name, sourceFile, durationMinutes, thresholds, questions }`. Bentuk tiap soal (tipe lengkap ada di `src/types/index.ts`):

```jsonc
{
  "id": "S1-TIU-058",
  "packageId": "S1",
  "number": 58,
  "category": "TIU",                // TWK | TIU | TKP
  "topic": "Figural - analogi",
  "question": "Teks polos soal",
  "blocks": [                       // isi soal berurutan, untuk ditampilkan
    { "type": "text", "text": "Mendukung **tebal** dan *miring* dari PDF" },
    { "type": "table", "headers": ["Tim"], "rows": [["Tim I"]] },
    { "type": "image", "src": "/images/questions/s1/q58-soal.png", "alt": "...", "width": 740, "height": 183 }
  ],
  "options": [
    { "id": "A", "text": "Pilihan teks" },
    { "id": "B", "text": "", "image": { "src": "...", "alt": "...", "width": 129, "height": 129 } }
  ],
  "correctAnswer": "B",             // null untuk TKP
  "explanation": "Pembahasan...",
  "optionScores": null,             // TKP: { "A": 4, "B": 2, "C": 5, "D": 3, "E": 1 }
  "source": { "questionPage": 18, "explanationPage": 39 },
  "reviewFlags": []                 // catatan extractor untuk pemeriksaan manual
}
```

Penilaian (`src/lib/scoring.ts`): TWK dan TIU benar 5, salah atau kosong 0. TKP memakai bobot opsi dari soal itu sendiri, kosong 0. Maksimal 150 + 175 + 225 = 550.

## Akurasi data

- Kunci dibaca dari Bagian II dan Bagian III PDF, bobot TKP dari Bagian III dan Bagian IV. Keduanya dicocokkan; selisih apa pun menjadi `reviewFlags`.
- `verify_against_pdf.py` membandingkan setiap kata dengan hasil `pdftotext`, mesin yang berbeda dari extractor.
- Hasilnya ada di `data/reports/validation-report.md`, termasuk daftar soal yang perlu diperiksa manual.

## Menambah paket baru

1. Letakkan PDF di `data/source-pdfs/` dengan pola nama `Paket_S11_*.pdf`. Formatnya harus sama: Bagian I sampai IV, nomor 1-110.
2. Pasang PyMuPDF (`pip install pymupdf`) dan pastikan `pdftotext` tersedia, lalu jalankan `npm run extract:data`.
3. Tambahkan loader ke `LOADERS` di `src/lib/question-loader.ts`:
   ```ts
   S11: () => import("@/data/questions/paket-s11.json"),
   ```
4. Jalankan `npm run validate:data` dan `npm test`. Sesuaikan jumlah paket pada `tests/data.test.ts`, lalu periksa laporan validasi.

Halaman, statistik, dan rute paket akan mengikuti daftar `LOADERS` secara otomatis.

## Deployment ke Vercel

1. Push repository ini ke GitHub, GitLab, atau Bitbucket.
2. Di Vercel pilih **Add New > Project** dan impor repository. Framework terdeteksi sebagai Next.js; pengaturan bawaan sudah sesuai.
3. Klik **Deploy**. Tidak ada environment variable yang wajib.

Opsional: `NEXT_PUBLIC_SITE_URL` untuk domain kustom pada metadata dan sitemap. Tanpa itu, Vercel memakai domain produksinya.

Alternatif lewat CLI: `npx vercel --prod`.

## Catatan

- Progres tersimpan per browser. Membersihkan data browser akan menghapusnya.
- Ambang batas 65/80/166 adalah acuan pada naskah sumber dan ditetapkan ulang setiap tahun.
