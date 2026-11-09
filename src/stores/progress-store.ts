import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { attemptKey, completeAttempt } from "@/lib/attempt";
import { safeLocalStorage, STORAGE_KEY } from "@/lib/storage";
import { isExpired } from "@/lib/timer";
import type { Attempt, CompletedAttempt, FinishReason, OptionId, Question, Thresholds } from "@/types";

interface ProgressState {
  active: Record<string, Attempt>;
  history: CompletedAttempt[];
  bookmarks: string[];

  startAttempt: (attempt: Attempt) => void;
  discardAttempt: (key: string) => void;
  setAnswer: (key: string, questionNumber: number, option: OptionId | null) => void;
  toggleFlag: (key: string, questionNumber: number) => void;
  goTo: (key: string, index: number) => void;
  addTime: (key: string, questionNumber: number, ms: number) => void;
  markWarnings: (key: string, minutes: number[]) => void;
  finishAttempt: (
    key: string,
    questions: Question[],
    thresholds: Thresholds,
    reason: FinishReason,
    now?: number,
  ) => CompletedAttempt | null;
  toggleBookmark: (questionId: string) => void;
  resetAll: () => void;
}

const EMPTY = { active: {}, history: [], bookmarks: [] };

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => {
      const patch = (key: string, update: (attempt: Attempt) => Partial<Attempt>) =>
        set((state) => {
          const attempt = state.active[key];
          if (!attempt) return state;
          return { active: { ...state.active, [key]: { ...attempt, ...update(attempt) } } };
        });

      return {
        ...EMPTY,

        startAttempt: (attempt) =>
          set((state) => ({ active: { ...state.active, [attemptKey(attempt.mode, attempt.packageId)]: attempt } })),

        discardAttempt: (key) =>
          set((state) => {
            const active = { ...state.active };
            delete active[key];
            return { active };
          }),

        setAnswer: (key, questionNumber, option) => {
          const attempt = get().active[key];
          // Jawaban setelah waktu habis ditolak meski tampilan belum sempat menutup ujian.
          if (attempt?.deadlineAt != null && isExpired(attempt.deadlineAt, Date.now())) return;
          patch(key, ({ answers }) => {
            const next = { ...answers };
            if (option) next[questionNumber] = option;
            else delete next[questionNumber];
            return { answers: next };
          });
        },

        toggleFlag: (key, questionNumber) =>
          patch(key, ({ flagged }) => ({
            flagged: flagged.includes(questionNumber)
              ? flagged.filter((n) => n !== questionNumber)
              : [...flagged, questionNumber],
          })),

        goTo: (key, index) => patch(key, () => ({ currentIndex: index })),

        addTime: (key, questionNumber, ms) =>
          patch(key, ({ timeSpentMs }) => ({
            timeSpentMs: { ...timeSpentMs, [questionNumber]: (timeSpentMs[questionNumber] ?? 0) + ms },
          })),

        markWarnings: (key, minutes) =>
          patch(key, ({ warningsShown }) => ({ warningsShown: [...new Set([...warningsShown, ...minutes])] })),

        finishAttempt: (key, questions, thresholds, reason, now = Date.now()) => {
          const attempt = get().active[key];
          if (!attempt) return null;
          const completed = completeAttempt(attempt, questions, thresholds, reason, now);
          set((state) => {
            const active = { ...state.active };
            delete active[key];
            return { active, history: [...state.history.filter((a) => a.id !== completed.id), completed] };
          });
          return completed;
        },

        toggleBookmark: (questionId) =>
          set((state) => ({
            bookmarks: state.bookmarks.includes(questionId)
              ? state.bookmarks.filter((id) => id !== questionId)
              : [...state.bookmarks, questionId],
          })),

        resetAll: () => set(EMPTY),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      // Dibaca setelah mount oleh AppProviders agar HTML server dan klien pertama identik.
      skipHydration: true,
      partialize: ({ active, history, bookmarks }) => ({ active, history, bookmarks }),
    },
  ),
);
