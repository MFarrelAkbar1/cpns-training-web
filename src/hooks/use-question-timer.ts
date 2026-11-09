"use client";

import { useCallback, useEffect, useRef } from "react";
import { useProgressStore } from "@/stores/progress-store";

/** Mencatat lama sebuah soal terbuka; waktu saat tab tersembunyi tidak dihitung. */
export function useQuestionTimer(attemptKey: string, questionNumber: number | undefined): () => void {
  const addTime = useProgressStore((s) => s.addTime);
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (questionNumber === undefined) return;
    let enteredAt: number | null = document.hidden ? null : Date.now();

    const commit = () => {
      if (enteredAt === null) return;
      const elapsed = Date.now() - enteredAt;
      enteredAt = null;
      if (elapsed > 0) addTime(attemptKey, questionNumber, elapsed);
    };
    flushRef.current = () => {
      commit();
      if (!document.hidden) enteredAt = Date.now();
    };
    const onVisibility = () => {
      if (document.hidden) commit();
      else enteredAt = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", commit);
    return () => {
      commit();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", commit);
    };
  }, [attemptKey, questionNumber, addTime]);

  // Dipanggil sebelum ujian diselesaikan agar waktu soal terakhir ikut tersimpan.
  return useCallback(() => flushRef.current(), []);
}
