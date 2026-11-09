"use client";

import { useSyncExternalStore } from "react";
import { useProgressStore } from "@/stores/progress-store";

/** False di server dan render pertama; true setelah data localStorage terbaca. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useProgressStore.persist.onFinishHydration(onChange),
    () => useProgressStore.persist.hasHydrated(),
    () => false,
  );
}
