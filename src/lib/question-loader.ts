import type { QuestionPackage, Thresholds } from "@/types";

/** Tiap paket dimuat terpisah agar halaman tidak membawa 10 paket sekaligus. */
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  S1: () => import("@/data/questions/paket-s1.json"),
  S2: () => import("@/data/questions/paket-s2.json"),
  S3: () => import("@/data/questions/paket-s3.json"),
  S4: () => import("@/data/questions/paket-s4.json"),
  S5: () => import("@/data/questions/paket-s5.json"),
  S6: () => import("@/data/questions/paket-s6.json"),
  S7: () => import("@/data/questions/paket-s7.json"),
  S8: () => import("@/data/questions/paket-s8.json"),
  S9: () => import("@/data/questions/paket-s9.json"),
  S10: () => import("@/data/questions/paket-s10.json"),
};

export const PACKAGE_IDS = Object.keys(LOADERS);

export interface PackageMeta {
  id: string;
  name: string;
  totalQuestions: number;
  counts: { TWK: number; TIU: number; TKP: number };
  durationMinutes: number;
}

/** Komposisi ini dijaga oleh tests/data.test.ts terhadap isi JSON sebenarnya. */
export const PACKAGES: PackageMeta[] = PACKAGE_IDS.map((id) => ({
  id,
  name: `Paket ${id}`,
  totalQuestions: 110,
  counts: { TWK: 30, TIU: 35, TKP: 45 },
  durationMinutes: 100,
}));

export const TOTAL_QUESTIONS = PACKAGES.reduce((sum, p) => sum + p.totalQuestions, 0);

/** Ambang acuan dari Bagian IV seluruh PDF (sama di 10 paket; dijaga oleh test). */
export const THRESHOLDS: Thresholds = { TWK: 65, TIU: 80, TKP: 166, Total: 311 };

export function isPackageId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

const cache = new Map<string, Promise<QuestionPackage>>();

export function loadPackage(id: string): Promise<QuestionPackage> {
  const loader = LOADERS[id];
  if (!loader) return Promise.reject(new Error(`Paket ${id} tidak ditemukan`));
  let pending = cache.get(id);
  if (!pending) {
    pending = loader()
      .then((mod) => mod.default as QuestionPackage)
      .catch((error) => {
        cache.delete(id); // izinkan coba lagi setelah gagal jaringan
        throw error;
      });
    cache.set(id, pending);
  }
  return pending;
}
