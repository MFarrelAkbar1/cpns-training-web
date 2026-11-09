import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPackage, PACKAGE_IDS, PACKAGES, THRESHOLDS, TOTAL_QUESTIONS } from "@/lib/question-loader";
import { scoreAttempt } from "@/lib/scoring";
import { validatePackage } from "@/lib/validation";
import type { Answers, OptionId } from "@/types";

const raw = JSON.parse(readFileSync(join(process.cwd(), "data/reports/extraction-raw.json"), "utf8")) as Record<
  string,
  { keyTable: Record<string, string>; weightTable: Record<string, Record<OptionId, number>> }
>;

describe("data 10 paket", () => {
  it("total 1.100 soal", () => {
    expect(PACKAGE_IDS).toHaveLength(10);
    expect(TOTAL_QUESTIONS).toBe(1100);
  });

  describe.each(PACKAGE_IDS)("%s", (id) => {
    it("lolos validasi struktural, tanpa flag dari extractor", async () => {
      const pkg = await loadPackage(id);
      const report = validatePackage(pkg);
      expect(report.errors).toEqual([]);
      expect(pkg.questions.flatMap((q) => q.reviewFlags)).toEqual([]);
      expect(report.counts).toEqual(PACKAGES.find((p) => p.id === id)!.counts);
    });

    it("kunci TWK/TIU sama dengan tabel Kunci Jawaban Ringkas (Bagian II)", async () => {
      const pkg = await loadPackage(id);
      for (const q of pkg.questions.filter((x) => x.category !== "TKP")) {
        expect(q.correctAnswer).toBe(raw[id].keyTable[q.number]);
      }
    });

    it("bobot TKP sama dengan Tabel Bobot Skor (Bagian IV)", async () => {
      const pkg = await loadPackage(id);
      for (const q of pkg.questions.filter((x) => x.category === "TKP")) {
        expect(q.optionScores).toEqual(raw[id].weightTable[q.number]);
      }
    });

    it("ambang batas sama dengan konstanta aplikasi", async () => {
      expect((await loadPackage(id)).thresholds).toEqual(THRESHOLDS);
    });

    it("jawaban terbaik pada data asli menghasilkan 150/175/225 = 550", async () => {
      const pkg = await loadPackage(id);
      const best: Answers = {};
      for (const q of pkg.questions) {
        best[q.number] = q.correctAnswer ?? (Object.entries(q.optionScores!).find(([, v]) => v === 5)![0] as OptionId);
      }
      const r = scoreAttempt(pkg.questions, best);
      expect([r.byCategory.TWK.score, r.byCategory.TIU.score, r.byCategory.TKP.score, r.total]).toEqual([150, 175, 225, 550]);
    });
  });

  it("bobot TKP memang berbeda antarpaket", async () => {
    const [a, b] = await Promise.all([loadPackage("S1"), loadPackage("S2")]);
    const same = a.questions
      .filter((q) => q.category === "TKP")
      .every((q) => JSON.stringify(q.optionScores) === JSON.stringify(b.questions[q.number - 1].optionScores));
    expect(same).toBe(false);
  });
});
