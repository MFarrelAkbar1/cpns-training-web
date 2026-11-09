import { describe, expect, it } from "vitest";
import { isCorrect, maxScoreOf, meetsThresholds, rankCategories, scoreAttempt, scoreQuestion } from "@/lib/scoring";
import type { Answers, Category, OptionId, Question } from "@/types";

function q(number: number, category: Category, extra: Partial<Question> = {}): Question {
  return {
    id: `T-${number}`,
    packageId: "S1",
    number,
    category,
    topic: null,
    question: "",
    blocks: [],
    options: [],
    correctAnswer: category === "TKP" ? null : "B",
    explanation: "",
    optionScores: category === "TKP" ? { A: 4, B: 2, C: 5, D: 3, E: 1 } : null,
    source: { questionPage: 1, explanationPage: 1 },
    reviewFlags: [],
    ...extra,
  };
}

describe("scoreQuestion", () => {
  it("TWK/TIU: benar 5, salah 0, kosong 0", () => {
    for (const c of ["TWK", "TIU"] as const) {
      expect(scoreQuestion(q(1, c), "B")).toBe(5);
      expect(scoreQuestion(q(1, c), "A")).toBe(0);
      expect(scoreQuestion(q(1, c), undefined)).toBe(0);
    }
  });

  it("TKP: memakai bobot opsi yang dipilih, kosong 0", () => {
    const tkp = q(66, "TKP");
    const expected: Record<OptionId, number> = { A: 4, B: 2, C: 5, D: 3, E: 1 };
    for (const [option, value] of Object.entries(expected)) {
      expect(scoreQuestion(tkp, option as OptionId)).toBe(value);
    }
    expect(scoreQuestion(tkp, undefined)).toBe(0);
  });

  it("TKP: bobot mengikuti soalnya, bukan pemetaan tetap", () => {
    const other = q(67, "TKP", { optionScores: { A: 1, B: 5, C: 2, D: 3, E: 4 } });
    expect(scoreQuestion(other, "C")).toBe(2);
    expect(scoreQuestion(q(66, "TKP"), "C")).toBe(5);
  });

  it("menolak data yang tidak lengkap, bukan diam-diam memberi 0", () => {
    expect(() => scoreQuestion(q(1, "TWK", { correctAnswer: null }), "A")).toThrow();
    expect(() => scoreQuestion(q(66, "TKP", { optionScores: null }), "A")).toThrow();
  });
});

describe("isCorrect / maxScoreOf", () => {
  it("TKP tidak punya status benar-salah", () => {
    expect(isCorrect(q(66, "TKP"), "C")).toBeNull();
    expect(isCorrect(q(1, "TWK"), "B")).toBe(true);
    expect(isCorrect(q(1, "TWK"), "C")).toBe(false);
    expect(isCorrect(q(1, "TWK"), undefined)).toBeNull();
    expect(maxScoreOf(q(66, "TKP"))).toBe(5);
    expect(maxScoreOf(q(1, "TIU"))).toBe(5);
  });
});

describe("scoreAttempt", () => {
  const questions = [
    ...Array.from({ length: 30 }, (_, i) => q(i + 1, "TWK")),
    ...Array.from({ length: 35 }, (_, i) => q(i + 31, "TIU")),
    ...Array.from({ length: 45 }, (_, i) => q(i + 66, "TKP")),
  ];
  const fill = (from: number, to: number, option: OptionId): Answers =>
    Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, option]));

  it("semua kosong = 0, maksimum tetap 150/175/225", () => {
    const r = scoreAttempt(questions, {});
    expect(r.total).toBe(0);
    expect(r.blank).toBe(110);
    expect(r.max).toBe(550);
    expect([r.byCategory.TWK.max, r.byCategory.TIU.max, r.byCategory.TKP.max]).toEqual([150, 175, 225]);
  });

  it("jawaban sempurna = 550", () => {
    const r = scoreAttempt(questions, { ...fill(1, 65, "B"), ...fill(66, 110, "C") });
    expect(r.total).toBe(550);
    expect(r.answered).toBe(110);
    expect(r.correct).toBe(65);
  });

  it("campuran benar, salah, dan kosong", () => {
    const r = scoreAttempt(questions, { 1: "B", 2: "A", 31: "B", 66: "A", 67: "E" });
    expect(r.byCategory.TWK).toMatchObject({ score: 5, answered: 2, blank: 28, correct: 1, answeredMax: 10 });
    expect(r.byCategory.TIU).toMatchObject({ score: 5, answered: 1, blank: 34 });
    expect(r.byCategory.TKP).toMatchObject({ score: 5, answered: 2, blank: 43, correct: 0, answeredMax: 10 });
    expect(r.total).toBe(15);
  });

  it("ambang batas: ketiganya wajib terpenuhi", () => {
    const thresholds = { TWK: 65, TIU: 80, TKP: 166, Total: 311 };
    const pass = scoreAttempt(questions, { ...fill(1, 13, "B"), ...fill(31, 46, "B"), ...fill(66, 99, "C") });
    expect(pass.byCategory.TWK.score).toBe(65);
    expect(pass.byCategory.TIU.score).toBe(80);
    expect(pass.byCategory.TKP.score).toBe(170);
    expect(meetsThresholds(pass, thresholds)).toBe(true);

    const highTotalButTwkFails = scoreAttempt(questions, { ...fill(1, 12, "B"), ...fill(31, 65, "B"), ...fill(66, 110, "C") });
    expect(highTotalButTwkFails.total).toBeGreaterThan(311);
    expect(meetsThresholds(highTotalButTwkFails, thresholds)).toBe(false);
  });

  it("peringkat kategori memakai persentase, bukan skor mentah", () => {
    const r = scoreAttempt(questions, { ...fill(1, 30, "B"), ...fill(66, 80, "A") });
    expect(rankCategories(r)).toEqual({ best: "TWK", worst: "TIU" });
    const s = scoreAttempt(questions, { ...fill(1, 10, "B"), ...fill(66, 110, "C"), ...fill(31, 45, "B") });
    expect(s.byCategory.TKP.score).toBeGreaterThan(s.byCategory.TWK.score);
    expect(rankCategories(s).best).toBe("TKP");
  });
});
