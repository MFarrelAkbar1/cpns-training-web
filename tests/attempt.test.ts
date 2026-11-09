import { beforeEach, describe, expect, it, vi } from "vitest";
import { attemptKey, averageTimePerQuestion, createAttempt, shuffled } from "@/lib/attempt";
import { dashboardStats, packageStatus, recommendCategory } from "@/lib/stats";
import { loadPackage, THRESHOLDS } from "@/lib/question-loader";
import { STORAGE_KEY } from "@/lib/storage";
import { useProgressStore } from "@/stores/progress-store";

const numbers = Array.from({ length: 110 }, (_, i) => i + 1);
const key = attemptKey("exam", "S1");
const NOW = 1_800_000_000_000;

function start(mode: "exam" | "practice" = "exam", shuffle = false) {
  const attempt = createAttempt({ packageId: "S1", mode, questionNumbers: numbers, shuffle, now: NOW });
  useProgressStore.getState().startAttempt(attempt);
  return attempt;
}

beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  useProgressStore.getState().resetAll();
});

describe("createAttempt", () => {
  it("default mengikuti urutan PDF dan latihan tanpa batas waktu", () => {
    const attempt = createAttempt({ packageId: "S1", mode: "practice", questionNumbers: numbers, shuffle: false, now: NOW });
    expect(attempt.order).toEqual(numbers);
    expect(attempt.deadlineAt).toBeNull();
  });

  it("simulasi berbatas tepat 100 menit", () => {
    expect(start().deadlineAt).toBe(NOW + 100 * 60000);
  });

  it("pengacakan tetap memuat setiap soal tepat sekali", () => {
    const attempt = createAttempt({ packageId: "S1", mode: "exam", questionNumbers: numbers, shuffle: true, now: NOW });
    expect(attempt.order).not.toEqual(numbers);
    expect([...attempt.order].sort((a, b) => a - b)).toEqual(numbers);
    expect(shuffled([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});

describe("progress store", () => {
  it("menyimpan jawaban otomatis ke localStorage", () => {
    vi.useFakeTimers({ now: NOW });
    start();
    useProgressStore.getState().setAnswer(key, 1, "C");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.state.active[key].answers).toEqual({ 1: "C" });
  });

  it("jawaban dapat diubah dan dihapus", () => {
    vi.useFakeTimers({ now: NOW });
    start();
    const s = useProgressStore.getState();
    s.setAnswer(key, 1, "C");
    s.setAnswer(key, 1, "D");
    expect(useProgressStore.getState().active[key].answers[1]).toBe("D");
    s.setAnswer(key, 1, null);
    expect(useProgressStore.getState().active[key].answers[1]).toBeUndefined();
  });

  it("menolak jawaban setelah waktu simulasi habis", () => {
    vi.useFakeTimers({ now: NOW });
    const attempt = start();
    vi.setSystemTime(attempt.deadlineAt! - 1);
    useProgressStore.getState().setAnswer(key, 1, "A");
    vi.setSystemTime(attempt.deadlineAt!);
    useProgressStore.getState().setAnswer(key, 2, "B");
    expect(useProgressStore.getState().active[key].answers).toEqual({ 1: "A" });
  });

  it("menyelesaikan ujian: skor dari data asli, waktu selesai tidak melewati batas", async () => {
    const pkg = await loadPackage("S1");
    const attempt = start();
    const s = useProgressStore.getState();
    s.setAnswer(key, 1, pkg.questions[0].correctAnswer);
    const completed = s.finishAttempt(key, pkg.questions, pkg.thresholds, "timeout", attempt.deadlineAt! + 999_999);
    expect(completed?.result.byCategory.TWK.score).toBe(5);
    expect(completed?.finishedAt).toBe(attempt.deadlineAt);
    expect(completed?.finishReason).toBe("timeout");
    expect(useProgressStore.getState().active[key]).toBeUndefined();
    expect(useProgressStore.getState().history).toHaveLength(1);
  });

  it("selesai dua kali tidak menggandakan riwayat", async () => {
    const pkg = await loadPackage("S1");
    start();
    const s = useProgressStore.getState();
    s.finishAttempt(key, pkg.questions, pkg.thresholds, "user");
    expect(s.finishAttempt(key, pkg.questions, pkg.thresholds, "user")).toBeNull();
    expect(useProgressStore.getState().history).toHaveLength(1);
  });

  it("ragu-ragu dan bookmark dapat dibolak-balik; reset menghapus semua", () => {
    start();
    const s = useProgressStore.getState();
    s.toggleFlag(key, 5);
    expect(useProgressStore.getState().active[key].flagged).toEqual([5]);
    s.toggleFlag(key, 5);
    expect(useProgressStore.getState().active[key].flagged).toEqual([]);
    s.toggleBookmark("S1-TWK-001");
    expect(useProgressStore.getState().bookmarks).toEqual(["S1-TWK-001"]);
    s.resetAll();
    const after = useProgressStore.getState();
    expect([after.active, after.history, after.bookmarks]).toEqual([{}, [], []]);
  });

  it("melanjutkan simulasi: state terbaca kembali dari localStorage", async () => {
    vi.useFakeTimers({ now: NOW });
    const attempt = start();
    useProgressStore.getState().setAnswer(key, 7, "E");
    useProgressStore.setState({ active: {} });
    const raw = { state: { active: { [key]: { ...attempt, answers: { 7: "E" } } }, history: [], bookmarks: [] }, version: 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    await useProgressStore.persist.rehydrate();
    const restored = useProgressStore.getState().active[key];
    expect(restored.answers[7]).toBe("E");
    expect(restored.deadlineAt).toBe(attempt.deadlineAt);
  });

  it("rata-rata waktu dihitung dari soal yang dibuka", () => {
    start();
    const s = useProgressStore.getState();
    s.addTime(key, 1, 1000);
    s.addTime(key, 1, 1000);
    s.addTime(key, 2, 4000);
    expect(averageTimePerQuestion(useProgressStore.getState().active[key])).toBe(3000);
  });
});

describe("statistik", () => {
  it("status paket", async () => {
    const pkg = await loadPackage("S1");
    expect(packageStatus("S1", [], [])).toBe("not_started");
    const attempt = start();
    expect(packageStatus("S1", [attempt], [])).toBe("in_progress");
    const done = useProgressStore.getState().finishAttempt(key, pkg.questions, pkg.thresholds, "user")!;
    expect(packageStatus("S1", [], [done])).toBe("completed");
    expect(packageStatus("S2", [], [done])).toBe("not_started");
  });

  it("rata-rata skor hanya dari simulasi; latihan tetap masuk jumlah soal", async () => {
    const pkg = await loadPackage("S1");
    const s = useProgressStore.getState();
    start("exam");
    s.setAnswer(key, 1, pkg.questions[0].correctAnswer);
    const exam = s.finishAttempt(key, pkg.questions, pkg.thresholds, "user")!;
    start("practice");
    const practiceKey = attemptKey("practice", "S1");
    s.setAnswer(practiceKey, 66, "A");
    const practice = s.finishAttempt(practiceKey, pkg.questions, pkg.thresholds, "user")!;
    const stats = dashboardStats([exam, practice], THRESHOLDS);
    expect(stats.answeredTotal).toBe(2);
    expect(stats.averageScore).toBe(5);
    expect(stats.trend).toHaveLength(1);
    expect(stats.completedPackages).toBe(1);
  });

  it("rekomendasi memperhitungkan ambang: TKP 70% lebih lemah daripada TWK 50%", () => {
    const c = (category: "TWK" | "TIU" | "TKP", percent: number | null) => ({ category, answered: 1, correct: 0, percent });
    expect(recommendCategory([c("TWK", 50), c("TIU", 60), c("TKP", 70)], THRESHOLDS)).toBe("TKP");
    expect(recommendCategory([c("TWK", 30), c("TIU", 60), c("TKP", 90)], THRESHOLDS)).toBe("TWK");
    expect(recommendCategory([c("TWK", null), c("TIU", null), c("TKP", null)], THRESHOLDS)).toBeNull();
  });
});
