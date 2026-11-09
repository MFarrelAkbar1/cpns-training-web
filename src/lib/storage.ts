import type { StateStorage } from "zustand/middleware";

export const STORAGE_KEY = "cat-cpns-2027:progress";

/** Dipanggil saat browser menolak menyimpan (kuota penuh atau mode privat). */
let onWriteError: (() => void) | null = null;
export function setStorageErrorHandler(handler: (() => void) | null): void {
  onWriteError = handler;
}

export const safeLocalStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      onWriteError?.();
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      onWriteError?.();
    }
  },
};
