#!/usr/bin/env python3
"""Verifikasi JSON soal terhadap PDF memakai mesin ekstraksi yang berbeda.

extract_questions.py memakai MuPDF; script ini memakai pdftotext (Poppler), jadi
kesalahan khas salah satu mesin tidak bisa lolos diam-diam. Dua pemeriksaan:

1. Urutan: tiap soal/opsi/pembahasan (hanya huruf & angka) harus muncul utuh dan
   berurutan pada teks PDF.
2. Kelengkapan: jumlah tiap kata di bagian Soal dan Pembahasan PDF harus sama
   dengan jumlah kata pada JSON, sehingga tidak ada teks yang hilang atau bertambah.

Pemakaian: python scripts/verify_against_pdf.py
Keluaran : data/reports/pdf-verification.json (exit code 1 bila ada selisih)
"""
from __future__ import annotations

import collections
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOTER = re.compile(r"^(SOALCPNS - Paket S\d+ - Bank Soal SKD CPNS)?\s*(Hal\. \d+)?$")
WORD = re.compile(r"[0-9A-Za-zÀ-ÿ]+")


def pages(pdf: str) -> list[str]:
    out = subprocess.run(["pdftotext", "-raw", "-enc", "UTF-8", pdf, "-"], capture_output=True, check=True).stdout
    return out.decode("utf-8").split("\f")


def strip_page(text: str) -> str:
    return "\n".join(l for l in text.splitlines() if not FOOTER.match(l.strip()))


def squash(s: str) -> str:
    return "".join(WORD.findall(s.replace("²", "2").replace("³", "3")))


def words(s: str) -> collections.Counter:
    return collections.Counter(WORD.findall(s.replace("²", "2").replace("³", "3")))


def section_pages(pgs: list[str]) -> dict[str, int]:
    found: dict[str, int] = {}
    for i, p in enumerate(pgs):
        if i < 2:
            continue  # daftar isi
        m = re.search(r"BAGIAN (I|II|III|IV) ", p)
        if m and m.group(1) not in found:
            found[m.group(1)] = i
    return found


def body_words(text: str, kind: str) -> collections.Counter:
    """Kata isi PDF, tanpa judul/label yang memang bukan bagian dari data soal."""
    drop = [
        r"BAGIAN I+V? • [^\n]+",
        r"Tes Wawasan Kebangsaan \(TWK\)",
        r"Tes Intelegensi Umum \(TIU\)",
        r"Tes Karakteristik Pribadi \(TKP\)",
        r"Pembahasan (TWK|TIU|TKP) - [^\n]+",
    ]
    for pat in drop:
        text = re.sub(pat, " ", text)
    if kind == "soal":
        text = re.sub(r"Pada bagian ini tidak ada jawaban benar[\s\S]*?(?=\n66\. )", "\n", text)
    return words(text)


def verify(pdf: str, json_path: str) -> dict:
    pkg = json.load(open(json_path, encoding="utf-8"))
    pgs = pages(pdf)
    sec = section_pages(pgs)
    soal = "\n".join(strip_page(p) for p in pgs[sec["I"] : sec["II"]])
    bahas = "\n".join(strip_page(p) for p in pgs[sec["III"] : sec["IV"]])
    soal_sq, bahas_sq = squash(soal), squash(bahas)
    issues: list[str] = []
    json_soal: collections.Counter = collections.Counter()
    json_bahas: collections.Counter = collections.Counter()

    for q in pkg["questions"]:
        no = q["number"]
        json_soal.update(words(f"{no}"))
        for b in q["blocks"]:
            if b["type"] == "text":
                plain = b["text"].replace("*", "")
                json_soal.update(words(plain))
                for para in plain.split("\n"):
                    if squash(para) and squash(para) not in soal_sq:
                        issues.append(f"{q['id']}: teks soal tidak ditemukan berurutan: {para[:70]}")
            elif b["type"] == "table":
                for row in [b["headers"], *b["rows"]]:
                    for cell in row:
                        json_soal.update(words(cell))
                        if squash(cell) not in soal_sq:
                            issues.append(f"{q['id']}: sel tabel tidak ditemukan: {cell}")
        for o in q["options"]:
            if o["text"]:
                json_soal.update(words(o["id"]))
                json_soal.update(words(o["text"]))
                if squash(o["text"]) not in soal_sq:
                    issues.append(f"{q['id']}: opsi {o['id']} tidak ditemukan berurutan: {o['text'][:70]}")
        ex = q["explanation"]
        for para in ex.split("\n"):
            if squash(para) not in bahas_sq:
                issues.append(f"{q['id']}: pembahasan tidak ditemukan berurutan: {para[:70]}")
        json_bahas.update(words(ex))
        json_bahas.update(words(f"{no} {q['category']} {q['topic']}"))
        if q["category"] == "TKP":
            json_bahas.update(words("Opsi A B C D E Bobot"))
            json_bahas.update(words(" ".join(str(v) for v in q["optionScores"].values())))
        else:
            json_bahas.update(words(f"Kunci jawaban {q['correctAnswer']}"))

    # Label pada gambar & tabel (A-E, (1), ?, "Pilihan jawaban") hanya ada di PDF:
    # gambar disimpan sebagai PNG, jadi labelnya tidak muncul sebagai kata JSON.
    pdf_soal = body_words(soal, "soal")
    pdf_bahas = body_words(bahas, "bahas")
    figure_tokens = set("ABCDE") | {"1", "2", "3", "4", "Pilihan", "jawaban"}
    soal_missing = pdf_soal - json_soal
    soal_extra = json_soal - pdf_soal
    soal_missing_real = {k: v for k, v in soal_missing.items() if k not in figure_tokens}
    bahas_missing = pdf_bahas - json_bahas
    bahas_extra = json_bahas - pdf_bahas
    if soal_missing_real:
        issues.append(f"Kata PDF bagian soal tidak ada di JSON: {soal_missing_real}")
    if soal_extra:
        issues.append(f"Kata JSON bagian soal tidak ada di PDF: {dict(soal_extra)}")
    if bahas_missing:
        issues.append(f"Kata PDF bagian pembahasan tidak ada di JSON: {dict(bahas_missing)}")
    if bahas_extra:
        issues.append(f"Kata JSON bagian pembahasan tidak ada di PDF: {dict(bahas_extra)}")

    return {
        "package": pkg["id"],
        "wordsChecked": {"soal": sum(pdf_soal.values()), "pembahasan": sum(pdf_bahas.values())},
        "figureLabelTokensIgnored": {k: v for k, v in soal_missing.items() if k in figure_tokens},
        "issues": issues,
    }


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    results = []
    for pdf in sorted(glob.glob(os.path.join(ROOT, "data", "source-pdfs", "Paket_S*.pdf"))):
        n = int(re.search(r"Paket_S(\d+)_", pdf).group(1))
        r = verify(pdf, os.path.join(ROOT, "src", "data", "questions", f"paket-s{n}.json"))
        results.append(r)
        print(f"{r['package']}: kata soal {r['wordsChecked']['soal']}, pembahasan {r['wordsChecked']['pembahasan']}, selisih {len(r['issues'])}")
        for i in r["issues"]:
            print("   ", i[:400])
    with open(os.path.join(ROOT, "data", "reports", "pdf-verification.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return 1 if any(r["issues"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
