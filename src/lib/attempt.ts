import { computeDeadline } from "@/lib/timer";
import { meetsThresholds, scoreAttempt } from "@/lib/scoring";
import type { Attempt, AttemptMode, CompletedAttempt, FinishReason, Question, Thresholds } from "@/types";

export function attemptKey(mode: AttemptMode, packageId: string): string {
  return `${mode}:${packageId}`;
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createAttempt(input: {
  packageId: string;
  mode: AttemptMode;
  questionNumbers: number[];
  shuffle: boolean;
  now: number;
  random?: () => number;
}): Attempt {
  const { packageId, mode, questionNumbers, shuffle, now, random } = input;
  return {
    id: `${packageId}-${mode}-${now.toString(36)}-${Math.floor((random ?? Math.random)() * 1e6).toString(36)}`,
    packageId,
    mode,
    startedAt: now,
    deadlineAt: mode === "exam" ? computeDeadline(now) : null,
    // Hanya urutan soal yang diacak. Pilihan A-E tetap, karena kunci dan pembahasan merujuk hurufnya.
    order: shuffle ? shuffled(questionNumbers, random) : [...questionNumbers],
    shuffled: shuffle,
    currentIndex: 0,
    answers: {},
    flagged: [],
    timeSpentMs: {},
    warningsShown: [],
  };
}

export function completeAttempt(
  attempt: Attempt,
  questions: Question[],
  thresholds: Thresholds,
  reason: FinishReason,
  now: number,
): CompletedAttempt {
  const result = scoreAttempt(questions, attempt.answers);
  // Bila aplikasi baru terbuka lama setelah waktu habis, waktu selesai tetap batas ujian.
  const finishedAt = attempt.deadlineAt === null ? now : Math.min(now, attempt.deadlineAt);
  return { ...attempt, finishedAt, finishReason: reason, result, passed: meetsThresholds(result, thresholds) };
}

export function totalTimeMs(attempt: Attempt): number {
  return Object.values(attempt.timeSpentMs).reduce((sum, ms) => sum + ms, 0);
}

/** Rata-rata waktu pada soal yang benar-benar sempat dibuka; null bila belum tercatat. */
export function averageTimePerQuestion(attempt: Attempt): number | null {
  const visited = Object.keys(attempt.timeSpentMs).length;
  return visited ? totalTimeMs(attempt) / visited : null;
}
