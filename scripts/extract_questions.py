#!/usr/bin/env python3
"""Ekstrak bank soal SKD dari PDF sumber menjadi JSON terstruktur.

Pemakaian (dari root repo):
    python scripts/extract_questions.py

Masukan : data/source-pdfs/Paket_S??_*.pdf
Keluaran: src/data/questions/paket-s{n}.json
          public/images/questions/s{n}/q{no}-*.png   (gambar soal figural)
          data/reports/extraction-raw.json           (kunci/bobot dari tiap sumber)

Parser membedakan jenis isi dari font & warna PDF, bukan dari pola teks saja,
sehingga "1) ..." di dalam soal tidak tertukar dengan nomor soal. Script ini
tidak pernah mengarang isi: apa pun yang tidak sesuai pola dicatat sebagai flag
pada soal yang bersangkutan untuk diperiksa manual.

Penanda gaya pada teks `blocks`: **tebal** dan *miring* (lihat assert_no_star).
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

import fitz  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "source-pdfs")
OUT = os.path.join(ROOT, "src", "data", "questions")
IMG = os.path.join(ROOT, "public", "images", "questions")
REPORT = os.path.join(ROOT, "data", "reports")

RIGHT_EDGE = 541.3
FOOTER_Y = 800
FIGURE_DPI = 220
C_NUMBER = 0xB0791A
C_BODY = 0x000000
C_MUTED = 0x55595F
C_TABLE = 0x22262B
C_HEADING = 0x163575
C_BANNER = 0xFFFFFF
C_FIG_LABEL = 0x5A5A5A
C_FIG_MARK = 0x1B3A5C
SUPERSCRIPT = {"2": "²", "3": "³"}
LETTERS = "ABCDE"


def category_of(no: int) -> str:
    return "TWK" if no <= 30 else "TIU" if no <= 65 else "TKP"


def span_text(s: dict) -> str:
    t = s["text"]
    if s["font"] == "ZapfDingbats":
        # Satu-satunya glyph Dingbats di sumber: tanda centang pada pembahasan.
        return t.replace("\x13", "✓")
    if s["flags"] & 1 and s["size"] < 8:
        return "".join(SUPERSCRIPT.get(c, c) for c in t)
    return t


def style_of(s: dict) -> str:
    if "Bold" in s["font"]:
        return "b"
    if "Oblique" in s["font"]:
        return "i"
    return ""


class Paragraph:
    """Merangkai baris PDF menjadi teks, membedakan wrap otomatis dan baris baru asli."""

    def __init__(self) -> None:
        self.runs: list[list[str]] = []  # [style, text]
        self.joins: list[str] = []
        self.prev_line: dict | None = None

    def _add(self, style: str, text: str) -> None:
        if not text:
            return
        if self.runs and self.runs[-1][0] == style:
            self.runs[-1][1] += text
        else:
            self.runs.append([style, text])

    def _tail(self) -> str:
        return self.runs[-1][1] if self.runs else ""

    def add_line(self, spans: list[dict], line_bbox, new_block: bool = False) -> None:
        spans = [s for s in spans if span_text(s)]
        if not spans:
            return
        text = "".join(span_text(s) for s in spans)
        same_row = self.prev_line is not None and abs(self.prev_line["y0"] - line_bbox[1]) < 2 and not new_block
        if same_row:
            # Teks rata kanan bercelah lebar: MuPDF memecahnya jadi beberapa "baris"
            # pada ketinggian yang sama. Itu satu baris visual.
            if not self._tail().endswith(" "):
                self._add(self.runs[-1][0], " ")
        elif self.runs:
            first_word = text.strip().split(" ")[0]
            fits = (
                self.prev_line is not None
                and self.prev_line["x1"]
                + fitz.get_text_length(" " + first_word, fontname="helv", fontsize=spans[0]["size"])
                < RIGHT_EDGE
            )
            tail = self._tail().rstrip()
            if new_block or fits:
                self.runs[-1][1] = self.runs[-1][1].rstrip()
                self._add(self.runs[-1][0], "\n")
            elif re.search(r"\w-$", tail):
                # "bulan-" + "bulan": tanda hubung bagian dari kata; jangan beri spasi.
                self.runs[-1][1] = self.runs[-1][1].rstrip()
                self.joins.append(tail[-20:] + "|" + first_word)
            elif not self._tail().endswith(" "):
                self._add(self.runs[-1][0], " ")
        for i, s in enumerate(spans):
            t = span_text(s)
            if i == 0 and not self.runs:
                t = t.lstrip()
            self._add(style_of(s), t)
        self.prev_line = {"x1": line_bbox[2], "y0": line_bbox[1]}

    def plain(self) -> str:
        return clean("".join(t for _, t in self.runs))

    def marked(self) -> str:
        out = []
        for style, text in self.runs:
            lines = text.split("\n")
            parts = []
            for ln in lines:
                core = ln.strip()
                if not core or not style:
                    parts.append(ln)
                    continue
                mark = "**" if style == "b" else "*"
                lead = ln[: len(ln) - len(ln.lstrip())]
                trail = ln[len(ln.rstrip()) :]
                parts.append(f"{lead}{mark}{core}{mark}{trail}")
            out.append("\n".join(parts))
        return clean("".join(out))


def clean(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" ?\n ?", "\n", s)
    return s.strip()


_CACHE: dict = {}


def cached(page: fitz.Page, kind: str, fn):
    """find_tables/get_drawings/get_text mahal; hitung sekali per halaman.

    Kunci hanya memakai nomor halaman, jadi build_package wajib mengosongkan
    cache sebelum membuka PDF berikutnya.
    """
    key = (page.number, kind)
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


class PageTable:
    """Salinan tabel yang aman disimpan.

    Table.extract() PyMuPDF membaca state global dari halaman yang terakhir
    dianalisis, jadi isinya harus diambil saat itu juga, bukan belakangan.
    """

    def __init__(self, table) -> None:
        self.bbox = table.bbox
        self.row_count = table.row_count
        self.col_count = table.col_count
        self.rows = table.extract()

    def extract(self) -> list:
        return self.rows


def page_tables(page: fitz.Page) -> list[PageTable]:
    return cached(page, "tables", lambda: [PageTable(t) for t in page.find_tables().tables])


def page_lines(page: fitz.Page) -> list[dict]:
    return cached(page, "lines", lambda: _page_lines(page))


def _page_lines(page: fitz.Page) -> list[dict]:
    """Baris halaman, terurut per blok dari atas ke bawah; footer dibuang."""
    items = []
    blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
    blocks.sort(key=lambda b: (round(b["bbox"][1]), b["bbox"][0]))
    for bi, b in enumerate(blocks):
        for l in b["lines"]:
            if l["bbox"][1] > FOOTER_Y or not l["spans"]:
                continue
            items.append({"block": bi, "bbox": l["bbox"], "spans": l["spans"], "text": "".join(s["text"] for s in l["spans"])})
    return items


def in_rect(bbox, rect, tol: float = 2) -> bool:
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    return rect[0] - tol <= cx <= rect[2] + tol and rect[1] - tol <= cy <= rect[3] + tol


def table_data(table) -> dict:
    rows = [[re.sub(r"\s+", " ", (c or "")).strip() for c in r] for r in table.extract()]
    return {"headers": rows[0], "rows": rows[1:]}


def find_part_pages(doc) -> dict:
    parts = {}
    for i, p in enumerate(doc):
        for ln in page_lines(p):
            m = re.match(r"BAGIAN (I|II|III|IV)\b", ln["text"])
            if m and ln["spans"][0]["color"] == C_BANNER:
                parts[m.group(1)] = i
    return parts


# ---------------------------------------------------------------- Bagian I: soal


def parse_questions(doc, start: int, end: int) -> dict[int, dict]:
    qs: dict[int, dict] = {}
    cur = None
    expected = 1

    for pn in range(start, end):
        page = doc[pn]
        tables = page_tables(page)
        lines = page_lines(page)
        q_positions = []  # (no, y) di halaman ini, untuk memotong area gambar

        for ln in lines:
            s0 = ln["spans"][0]
            color, font, size = s0["color"], s0["font"], s0["size"]
            first = s0["text"].strip()

            if color == C_NUMBER and "Bold" in font and re.fullmatch(r"\d+\.", first):
                no = int(first[:-1])
                if no != expected:
                    raise SystemExit(f"p{pn+1}: nomor {no}, harusnya {expected}")
                expected += 1
                cur = {
                    "number": no,
                    "page": pn + 1,
                    "parts": [],  # urutan isi stem: (page, y, kind, payload)
                    "para": None,
                    "last_block": None,
                    "options": {},
                    "opt_para": None,
                    "segments": [],
                    "flags": [],
                    "table_lines": {},
                    "table_bands": [],
                }
                qs[no] = cur
                q_positions.append((no, ln["bbox"][1]))
                spans = [dict(s) for s in ln["spans"][1:]]
                para = Paragraph()
                para.add_line(spans, ln["bbox"])
                cur["para"] = para
                cur["parts"].append([pn, ln["bbox"][1], "text", para])
                cur["last_block"] = (pn, ln["block"])
                continue

            if color in (C_BANNER, C_HEADING):
                continue  # judul bagian/seksi, bukan isi soal
            if cur is None:
                continue

            if color == C_TABLE:
                # Kumpulkan sel; tabel dirakit dari posisi teks di finish_tables().
                cur["table_lines"].setdefault(pn, []).append(ln)
                if not any(p[2] == "table_marker" and p[0] == pn for p in cur["parts"]):
                    cur["parts"].append([pn, ln["bbox"][1], "table_marker", None])
                    cur["para"] = None
                continue

            # Label di dalam area gambar: ditangani saat memotong gambar.
            if color in (C_FIG_LABEL, C_FIG_MARK) or ("Oblique" in font and size < 9):
                continue

            if color == C_MUTED and "Bold" in font and re.fullmatch(r"[A-E]\.", first):
                letter = first[0]
                if letter in cur["options"]:
                    cur["flags"].append(f"Opsi {letter} ganda (hal. {pn+1})")
                para = Paragraph()
                cur["options"][letter] = {"para": para, "page": pn + 1}
                cur["opt_para"] = para
                if len(ln["spans"]) > 1:
                    para.add_line(ln["spans"][1:], ln["bbox"])
                continue

            if color == C_BODY and abs(size - 9.7) < 0.05:
                if cur["opt_para"] is None:
                    cur["flags"].append(f"Teks gaya opsi tanpa huruf opsi (hal. {pn+1}): {ln['text'][:60]}")
                    continue
                cur["opt_para"].add_line(ln["spans"], ln["bbox"])
                continue

            if color == C_BODY:
                if cur["options"]:
                    cur["flags"].append(f"Teks soal setelah opsi (hal. {pn+1}): {ln['text'][:60]}")
                    continue
                new_block = cur["last_block"] != (pn, ln["block"])
                if cur["para"] is None:
                    cur["para"] = Paragraph()
                    cur["parts"].append([pn, ln["bbox"][1], "text", cur["para"]])
                    new_block = False
                cur["para"].add_line(ln["spans"], ln["bbox"], new_block=new_block)
                cur["last_block"] = (pn, ln["block"])
                continue

            cur["flags"].append(f"Teks tak dikenal (hal. {pn+1}): {ln['text'][:60]}")

        # Area vertikal tiap soal pada halaman ini, untuk mencari gambar.
        ys = sorted(q_positions, key=lambda x: x[1])
        if cur is not None:
            first_y = ys[0][1] if ys else FOOTER_Y
            if ys and ys[0][0] > 1:
                prev = qs.get(ys[0][0] - 1)
                if prev is not None:
                    prev["segments"].append((pn, 0, first_y))
            elif not ys:
                cur["segments"].append((pn, 0, FOOTER_Y))
            for i, (no, y) in enumerate(ys):
                bottom = ys[i + 1][1] if i + 1 < len(ys) else FOOTER_Y
                qs[no]["segments"].append((pn, y, bottom))
    return qs


def finish_tables(doc, q: dict) -> None:
    """Rakit tabel soal dari posisi sel, lalu bandingkan dengan find_tables.

    find_tables kadang kehilangan kolom pertama, sedangkan teks sel selalu lengkap.
    """
    for part in list(q["parts"]):
        if part[2] != "table_marker":
            continue
        pn = part[0]
        rows: list[list[dict]] = []
        for ln in sorted(q["table_lines"][pn], key=lambda l: l["bbox"][1]):
            if rows and abs(rows[-1][0]["bbox"][1] - ln["bbox"][1]) < 3:
                rows[-1].append(ln)
            else:
                rows.append([ln])
        grid = [[re.sub(r"\s+", " ", c["text"]).strip() for c in sorted(r, key=lambda l: l["bbox"][0])] for r in rows]
        if len({len(r) for r in grid}) != 1:
            q["flags"].append(f"Jumlah kolom tabel tidak seragam (hal. {pn+1}): {grid}")
        part[2], part[3] = "table", {"headers": grid[0], "rows": grid[1:]}
        q["table_bands"].append((pn, rows[0][0]["bbox"][1] - 6, rows[-1][0]["bbox"][3] + 6))
        for t in page_tables(doc[pn]):
            found = table_data(t)
            if t.row_count == len(grid) and t.col_count == len(grid[0]) and in_rect(rows[0][0]["bbox"], t.bbox):
                if [found["headers"]] + found["rows"] != grid:
                    q["flags"].append(f"Isi tabel berbeda antar-metode (hal. {pn+1}): {found} vs {grid}")


def figure_drawings(page, tables, top: float, bottom: float, bands=()) -> list[fitz.Rect]:
    rects = []
    for d in cached(page, "drawings", page.get_drawings):
        r = d["rect"]
        if r.y0 < top - 1 or r.y1 > bottom + 1 or r.y0 > FOOTER_Y:
            continue
        if any(in_rect((r.x0, r.y0, r.x1, r.y1), t.bbox) for t in tables):
            continue
        if any(band[0] <= (r.y0 + r.y1) / 2 <= band[1] for band in bands):
            continue
        rects.append(r)
    return rects


def union(rects, pad: float = 2.0) -> fitz.Rect:
    u = fitz.Rect(rects[0])
    for r in rects[1:]:
        u |= r
    return fitz.Rect(u.x0 - pad, u.y0 - pad, u.x1 + pad, u.y1 + pad)


def save_crop(page, rect, path: str) -> tuple[int, int]:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pix = page.get_pixmap(clip=rect, dpi=FIGURE_DPI, colorspace=fitz.csGRAY, alpha=False)
    pix.save(path)
    return pix.width, pix.height


def extract_figures(doc, q: dict, pkg_lower: str) -> None:
    """Potong gambar stem & gambar tiap opsi langsung dari PDF."""
    folder = os.path.join(IMG, pkg_lower)
    no = q["number"]
    stem_index = 0
    for pn, top, bottom in q["segments"]:
        page = doc[pn]
        tables = page_tables(page)
        bands = [(a, b) for p, a, b in q["table_bands"] if p == pn]
        rects = figure_drawings(page, tables, top, bottom, bands)
        if not rects:
            continue
        labels = {}
        pilihan_top = pilihan_bottom = None
        marks = []
        body_bottom = top
        for ln in page_lines(page):
            y0, y1 = ln["bbox"][1], ln["bbox"][3]
            if y0 < top - 1 or y0 >= bottom - 1:
                continue
            s0 = ln["spans"][0]
            if s0["color"] == C_FIG_LABEL and "Bold" in s0["font"] and ln["text"].strip() in LETTERS and len(ln["text"].strip()) == 1:
                labels[ln["text"].strip()] = ln["bbox"]
            elif ln["text"].strip().startswith("Pilihan jawaban"):
                pilihan_top, pilihan_bottom = y0, y1
            elif "Oblique" in s0["font"] and s0["size"] < 9:
                continue  # catatan petunjuk seksi (mis. awal TKP), bukan bagian gambar
            elif s0["color"] in (C_FIG_LABEL, C_FIG_MARK):
                marks.append(fitz.Rect(ln["bbox"]))
            elif s0["color"] in (C_BODY, C_NUMBER):
                if pilihan_top is None and not rects_above(rects, y0):
                    body_bottom = max(body_bottom, y1)

        if labels:
            if set(labels) != set(LETTERS):
                q["flags"].append(f"Label opsi gambar tidak lengkap: {sorted(labels)}")
            xs = sorted(((b[0] + b[2]) / 2) for b in labels.values())
            half = (xs[1] - xs[0]) / 2 if len(xs) > 1 else 28
            opt_top = pilihan_bottom if pilihan_bottom is not None else body_bottom
            for letter, b in labels.items():
                cx = (b[0] + b[2]) / 2
                cell = [
                    r
                    for r in rects
                    if r.y0 >= opt_top - 1 and r.y1 <= b[1] + 1 and cx - half <= (r.x0 + r.x1) / 2 <= cx + half
                ]
                if not cell:
                    q["flags"].append(f"Gambar opsi {letter} tidak ditemukan")
                    continue
                name = f"q{no}-{letter}.png"
                w, h = save_crop(page, union(cell), os.path.join(folder, name))
                opt = q["options"].setdefault(letter, {"para": Paragraph(), "page": pn + 1})
                opt["image"] = {"src": f"/images/questions/{pkg_lower}/{name}", "alt": f"Gambar pilihan {letter} soal nomor {no}", "width": w, "height": h}

        # Gambar stem: semua coretan di atas "Pilihan jawaban:" (bila ada).
        if pilihan_top is not None:
            stem_limit = pilihan_top
        elif labels:
            stem_limit = None  # seluruh gambar adalah opsi
        else:
            stem_limit = bottom
        if stem_limit is not None:
            stem_rects = [r for r in rects if r.y1 <= stem_limit + 1]
            stem_marks = [m for m in marks if m.y1 <= stem_limit + 1]
            if stem_rects:
                stem_index += 1
                name = f"q{no}-soal{'' if stem_index == 1 else stem_index}.png"
                area = union(stem_rects + stem_marks)
                w, h = save_crop(page, area, os.path.join(folder, name))
                q["parts"].append(
                    [pn, area.y0, "image", {"src": f"/images/questions/{pkg_lower}/{name}", "alt": f"Gambar soal nomor {no}", "width": w, "height": h}]
                )
                q["para"] = None


def rects_above(rects, y: float) -> bool:
    return any(r.y1 <= y for r in rects)


# ------------------------------------------------- Bagian II, III, IV: kunci & bobot


def parse_key_table(doc, start: int, end: int) -> dict[int, str]:
    keys: dict[int, str] = {}
    for pn in range(start, end):
        for t in page_tables(doc[pn]):
            rows = t.extract()
            if not rows or (rows[0][0] or "").strip() != "No":
                continue
            for r in rows[1:]:
                for i in range(0, len(r) - 1, 2):
                    n, k = (r[i] or "").strip(), (r[i + 1] or "").strip()
                    if n.isdigit() and k:
                        keys[int(n)] = k
    return keys


def parse_explanations(doc, start: int, end: int) -> dict[int, dict]:
    ex: dict[int, dict] = {}
    cur = None
    for pn in range(start, end):
        page = doc[pn]
        tables = page_tables(page)
        for ln in page_lines(page):
            s0 = ln["spans"][0]
            color, size = s0["color"], s0["size"]
            if color == C_BANNER:
                continue
            if color == C_HEADING and size > 11:
                continue
            m = re.fullmatch(r"(\d+)\. \[(TWK|TIU|TKP) • (.+)\]", ln["text"].strip()) if color == C_NUMBER else None
            if m:
                no = int(m.group(1))
                if no in ex:
                    raise SystemExit(f"Pembahasan ganda no {no}")
                cur = {"number": no, "category": m.group(2), "topic": m.group(3), "key": None, "scores": None,
                       "para": Paragraph(), "last_block": None, "page": pn + 1, "flags": [], "seen": set()}
                ex[no] = cur
                continue
            if cur is None:
                continue
            text = ln["text"].strip()
            if text.startswith("Kunci jawaban:") and cur["key"] is None:
                cur["key"] = text.split(":", 1)[1].strip()
                continue
            hit = next((t for t in tables if in_rect(ln["bbox"], t.bbox)), None)
            if hit is not None:
                key = (pn, round(hit.bbox[1]))
                if key in cur["seen"]:
                    continue
                cur["seen"].add(key)
                d = table_data(hit)
                row = d["rows"][0] if d["rows"] else []
                if d["headers"][:1] == ["Opsi"] and row[:1] == ["Bobot"]:
                    cur["scores"] = {h: int(v) for h, v in zip(d["headers"][1:], row[1:])}
                else:
                    cur["flags"].append(f"Tabel tak dikenal di pembahasan (hal. {pn+1})")
                continue
            new_block = cur["last_block"] != (pn, ln["block"]) and cur["last_block"] is not None and cur["last_block"][0] == pn
            cur["para"].add_line(ln["spans"], ln["bbox"], new_block=new_block)
            cur["last_block"] = (pn, ln["block"])
    return ex


def parse_weight_table(doc, start: int) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for pn in range(start, len(doc)):
        for t in page_tables(doc[pn]):
            rows = t.extract()
            if not rows or [(c or "").strip() for c in rows[0][:6]] != ["No", "A", "B", "C", "D", "E"]:
                continue
            for r in rows[1:]:
                for i in range(0, len(r), 6):
                    cells = [(c or "").strip() for c in r[i : i + 6]]
                    if len(cells) == 6 and cells[0].isdigit():
                        out[int(cells[0])] = {l: int(v) for l, v in zip(LETTERS, cells[1:])}
    return out


def parse_thresholds(doc, start: int) -> dict:
    for pn in range(start, len(doc)):
        for t in page_tables(doc[pn]):
            rows = t.extract()
            if rows and len(rows[0]) > 1 and (rows[0][1] or "").strip().startswith("Ambang batas"):
                return {(r[0] or "").strip(): int((r[1] or "").strip()) for r in rows[1:]}
    return {}


def strip_marks(s: str) -> str:
    return re.sub(r"\*+", "", s)


def assert_no_star(s: str, where: str) -> None:
    if "*" in s:
        raise SystemExit(f"Sumber memuat '*' pada {where}; penanda gaya akan rancu")


def build_package(path: str) -> tuple[dict, dict]:
    m = re.search(r"Paket_S(\d+)_", os.path.basename(path))
    n = int(m.group(1))
    pkg, lower = f"S{n}", f"s{n}"
    _CACHE.clear()
    doc = fitz.open(path)
    parts = find_part_pages(doc)
    if set(parts) != {"I", "II", "III", "IV"}:
        raise SystemExit(f"{path}: bagian tidak lengkap {parts}")

    qs = parse_questions(doc, parts["I"], parts["II"])
    for q in qs.values():
        finish_tables(doc, q)
        extract_figures(doc, q, lower)
    key_table = parse_key_table(doc, parts["II"], parts["III"])
    ex = parse_explanations(doc, parts["III"], parts["IV"])
    weights = parse_weight_table(doc, parts["IV"])
    thresholds = parse_thresholds(doc, parts["IV"])

    questions, joins = [], []
    for no in sorted(qs):
        q = qs[no]
        e = ex.get(no)
        cat = category_of(no)
        flags = list(q["flags"])
        blocks = []
        for _pn, _y, kind, payload in sorted(q["parts"], key=lambda x: (x[0], x[1])):
            if kind == "text":
                text = payload.marked()
                joins += payload.joins
                if text:
                    assert_no_star(payload.plain(), f"{pkg} no {no}")
                    if blocks and blocks[-1]["type"] == "text":
                        blocks[-1]["text"] += "\n" + text
                    else:
                        blocks.append({"type": "text", "text": text})
            elif kind == "table":
                blocks.append({"type": "table", **payload})
            else:
                blocks.append({"type": "image", **payload})

        options = []
        for letter in LETTERS:
            o = q["options"].get(letter)
            if o is None:
                flags.append(f"Opsi {letter} tidak ada")
                continue
            joins += o["para"].joins
            item = {"id": letter, "text": o["para"].plain()}
            if "image" in o:
                item["image"] = o["image"]
            if not item["text"] and "image" not in o:
                flags.append(f"Opsi {letter} kosong")
            options.append(item)

        scores = None
        explanation = ""
        topic = None
        key = None
        if e is None:
            flags.append("Pembahasan tidak ditemukan")
        else:
            topic = e["topic"]
            scores = e["scores"]
            explanation = e["para"].plain()
            joins += e["para"].joins
            flags += e["flags"]
            if e["category"] != cat:
                flags.append(f"Kategori pembahasan {e['category']} berbeda dari rentang nomor ({cat})")
            key = e["key"]

        if cat == "TKP":
            correct = None
            if scores != weights.get(no):
                flags.append(f"Bobot Bagian III {scores} berbeda dari Bagian IV {weights.get(no)}")
            if scores is None:
                scores = weights.get(no)
        else:
            correct = key_table.get(no)
            if key != correct:
                flags.append(f"Kunci Bagian II ({correct}) berbeda dari Bagian III ({key})")
            scores = None

        questions.append(
            {
                "id": f"{pkg}-{cat}-{no:03d}",
                "packageId": pkg,
                "number": no,
                "category": cat,
                "topic": topic,
                "question": clean("\n".join(strip_marks(b["text"]) for b in blocks if b["type"] == "text")),
                "blocks": blocks,
                "options": options,
                "correctAnswer": correct,
                "explanation": explanation,
                "optionScores": scores,
                "source": {"questionPage": q["page"], "explanationPage": e["page"] if e else None},
                "reviewFlags": flags,
            }
        )

    package = {
        "id": pkg,
        "name": f"Paket {pkg}",
        "sourceFile": os.path.basename(path),
        "durationMinutes": 100,
        "thresholds": thresholds,
        "questions": questions,
    }
    raw = {"keyTable": key_table, "weightTable": weights, "joins": joins}
    return package, raw


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    files = sorted(glob.glob(os.path.join(SRC, "Paket_S*.pdf")))
    if not files:
        raise SystemExit(f"Tidak ada PDF di {SRC}")
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(REPORT, exist_ok=True)
    raw_all = {}
    for f in files:
        pkg, raw = build_package(f)
        name = f"paket-{pkg['id'].lower()}.json"
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(pkg, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        raw_all[pkg["id"]] = raw
        n_flag = sum(1 for q in pkg["questions"] if q["reviewFlags"])
        print(f"{pkg['id']}: {len(pkg['questions'])} soal, {n_flag} soal ber-flag, -> {name}")
    with open(os.path.join(REPORT, "extraction-raw.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(raw_all, fh, ensure_ascii=False, indent=1)
        fh.write("\n")


if __name__ == "__main__":
    main()
