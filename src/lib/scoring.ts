import type { Answers, Category, CategoryScore, OptionId, Question, ScoreResult, Thresholds } from "@/types";

export const CORRECT_POINTS = 5;
export const CATEGORIES: readonly Category[] = ["TWK", "TIU", "TKP"];

/** Nilai satu soal. Kosong selalu 0; TKP memakai bobot opsi soal itu sendiri. */
export function scoreQuestion(question: Question, answer: OptionId | undefined): number {
  if (!answer) return 0;
  if (question.category === "TKP") {
    if (!question.optionScores) throw new Error(`Soal ${question.id} tidak punya bobot TKP`);
    return question.optionScores[answer] ?? 0;
  }
  if (!question.correctAnswer) throw new Error(`Soal ${question.id} tidak punya kunci jawaban`);
  return answer === question.correctAnswer ? CORRECT_POINTS : 0;
}

export function maxScoreOf(question: Question): number {
  if (question.category !== "TKP") return CORRECT_POINTS;
  if (!question.optionScores) throw new Error(`Soal ${question.id} tidak punya bobot TKP`);
  return Math.max(...Object.values(question.optionScores));
}

/** TKP tidak punya status benar/salah, jadi hasilnya null. */
export function isCorrect(question: Question, answer: OptionId | undefined): boolean | null {
  if (question.category === "TKP" || !answer) return null;
  return answer === question.correctAnswer;
}

function emptyCategory(): CategoryScore {
  return { score: 0, max: 0, total: 0, answered: 0, blank: 0, correct: 0, answeredMax: 0 };
}

export function scoreAttempt(questions: Question[], answers: Answers): ScoreResult {
  const byCategory: Record<Category, CategoryScore> = {
    TWK: emptyCategory(),
    TIU: emptyCategory(),
    TKP: emptyCategory(),
  };

  for (const question of questions) {
    const bucket = byCategory[question.category];
    const answer = answers[question.number];
    const max = maxScoreOf(question);
    bucket.total += 1;
    bucket.max += max;
    if (!answer) {
      bucket.blank += 1;
      continue;
    }
    bucket.answered += 1;
    bucket.answeredMax += max;
    bucket.score += scoreQuestion(question, answer);
    if (isCorrect(question, answer)) bucket.correct += 1;
  }

  const sum = (pick: (c: CategoryScore) => number) =>
    CATEGORIES.reduce((acc, c) => acc + pick(byCategory[c]), 0);

  return {
    total: sum((c) => c.score),
    max: sum((c) => c.max),
    answered: sum((c) => c.answered),
    blank: sum((c) => c.blank),
    correct: sum((c) => c.correct),
    byCategory,
  };
}

/** Sumber: ketiga ambang kategori harus terpenuhi; skor total tinggi tidak menutupi kekurangan. */
export function meetsThresholds(result: ScoreResult, thresholds: Thresholds): boolean {
  return CATEGORIES.every((c) => result.byCategory[c].score >= thresholds[c]);
}

/** Dibandingkan dengan persentase, karena maksimum tiap kategori berbeda. */
export function rankCategories(result: ScoreResult): { best: Category; worst: Category } {
  const ratio = (c: Category) => {
    const { score, max } = result.byCategory[c];
    return max ? score / max : 0;
  };
  const sorted = [...CATEGORIES].sort((a, b) => ratio(b) - ratio(a));
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
