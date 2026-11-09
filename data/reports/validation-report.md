# Laporan Validasi Data Soal

Dibuat oleh `npm run validate:data`. Pencocokan teks memakai `scripts/verify_against_pdf.py` (mesin pdftotext, berbeda dari extractor).

| Paket | Soal | TWK | TIU | TKP | Bertabel | Bergambar | Skor maks | Kata dicocokkan | Selisih teks | Gambar hilang | Error | Periksa manual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15956 | 0 | 0 | 0 | 0 |
| S2 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15545 | 0 | 0 | 0 | 0 |
| S3 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15571 | 0 | 0 | 0 | 0 |
| S4 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15288 | 0 | 0 | 0 | 1 |
| S5 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15479 | 0 | 0 | 0 | 1 |
| S6 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15139 | 0 | 0 | 0 | 0 |
| S7 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15492 | 0 | 0 | 0 | 0 |
| S8 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15747 | 0 | 0 | 0 | 0 |
| S9 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 16695 | 0 | 0 | 0 | 0 |
| S10 | 110 | 30 | 35 | 45 | 7 | 8 | 550 | 15750 | 0 | 0 | 0 | 0 |

## Error

Tidak ada.

## Perlu pemeriksaan manual

- S4-TWK-030: Merujuk bagian bercetak tebal, tetapi PDF menebalkan seluruh kalimat.
- S5-TWK-001: Merujuk kata bercetak miring, tetapi PDF tidak memuat teks miring pada soal ini.
