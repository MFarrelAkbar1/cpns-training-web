import { CATEGORIES } from "@/lib/scoring";
import type { Attempt, Category, CompletedAttempt, PackageStatus, Thresholds } from "@/types";

export function packageStatus(packageId: string, active: Attempt[], history: CompletedAttempt[]): PackageStatus {
  if (active.some((a) => a.packageId === packageId)) return "in_progress";
  if (history.some((a) => a.packageId === packageId)) return "completed";
  return "not_started";
}

export function latestCompleted(packageId: string, history: CompletedAttempt[]): CompletedAttempt | null {
  return history
    .filter((a) => a.packageId === packageId)
    .reduce<CompletedAttempt | null>((latest, a) => (!latest || a.finishedAt > latest.finishedAt ? a : latest), null);
}

export interface CategoryPerformance {
  category: Category;
  answered: number;
  correct: number;
  /** Capaian pada soal yang dijawab (0-100); null bila belum ada. */
  percent: number | null;
}

export interface DashboardStats {
  answeredTotal: number;
  correctTotal: number;
  averageScore: number | null;
  completedPackages: number;
  examCount: number;
  categories: CategoryPerformance[];
  trend: { attemptId: string; label: string; packageId: string; finishedAt: number; score: number }[];
  recommendation: Category | null;
}

export function dashboardStats(history: CompletedAttempt[], thresholds: Thresholds): DashboardStats {
  const chronological = [...history].sort((a, b) => a.finishedAt - b.finishedAt);
  const exams = chronological.filter((a) => a.mode === "exam");

  const categories: CategoryPerformance[] = CATEGORIES.map((category) => {
    let score = 0;
    let answeredMax = 0;
    let answered = 0;
    let correct = 0;
    for (const attempt of history) {
      const c = attempt.result.byCategory[category];
      score += c.score;
      answeredMax += c.answeredMax;
      answered += c.answered;
      correct += c.correct;
    }
    return { category, answered, correct, percent: answeredMax ? (score / answeredMax) * 100 : null };
  });

  return {
    answeredTotal: history.reduce((sum, a) => sum + a.result.answered, 0),
    correctTotal: history.reduce((sum, a) => sum + a.result.correct, 0),
    // Hanya simulasi: latihan boleh selesai sebagian sehingga skornya tidak sebanding.
    averageScore: exams.length ? exams.reduce((sum, a) => sum + a.result.total, 0) / exams.length : null,
    completedPackages: new Set(history.map((a) => a.packageId)).size,
    examCount: exams.length,
    categories,
    trend: exams.map((a, i) => ({
      attemptId: a.id,
      label: `#${i + 1}`,
      packageId: a.packageId,
      finishedAt: a.finishedAt,
      score: a.result.total,
    })),
    recommendation: recommendCategory(categories, thresholds),
  };
}

/**
 * Kategori paling perlu ditingkatkan: capaian terendah relatif terhadap ambang batasnya.
 * TKP punya ambang jauh lebih tinggi (74%) daripada TWK (43%), jadi persentase mentah
 * saja akan menyesatkan.
 */
export function recommendCategory(categories: CategoryPerformance[], thresholds: Thresholds): Category | null {
  const MAX: Record<Category, number> = { TWK: 150, TIU: 175, TKP: 225 };
  const scored = categories.filter((c) => c.percent !== null);
  if (!scored.length) return null;
  const margin = (c: CategoryPerformance) => (c.percent as number) / ((thresholds[c.category] / MAX[c.category]) * 100);
  return scored.reduce((worst, c) => (margin(c) < margin(worst) ? c : worst)).category;
}
