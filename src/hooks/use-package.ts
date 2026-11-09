"use client";

import { useEffect, useState } from "react";
import { loadPackage } from "@/lib/question-loader";
import type { QuestionPackage } from "@/types";

type State = { id: string; data: QuestionPackage | null; error: boolean };

export function usePackage(id: string): { data: QuestionPackage | null; error: boolean; retry: () => void } {
  const [state, setState] = useState<State>({ id, data: null, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadPackage(id).then(
      (data) => {
        if (!cancelled) setState({ id, data, error: false });
      },
      () => {
        if (!cancelled) setState({ id, data: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const current = state.id === id ? state : { data: null, error: false };
  return { data: current.data, error: current.error, retry: () => setAttempt((n) => n + 1) };
}
