/** Timer berbasis timestamp: sisa waktu selalu dihitung dari deadline absolut. */

export const EXAM_DURATION_MS = 100 * 60 * 1000;
export const WARNING_MINUTES = [15, 5, 1] as const;

export function computeDeadline(startedAt: number, durationMs = EXAM_DURATION_MS): number {
  return startedAt + durationMs;
}

export function remainingMs(deadlineAt: number, now: number): number {
  return Math.max(0, deadlineAt - now);
}

export function isExpired(deadlineAt: number, now: number): boolean {
  return now >= deadlineAt;
}

/** Dibulatkan ke atas agar 00:00 baru tampil saat waktu benar-benar habis. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(ms: number): string {
  const safe = Math.max(0, ms);
  const totalMinutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)} jam ${totalMinutes % 60} menit`;
  if (totalMinutes > 0) return `${totalMinutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

/**
 * Peringatan yang perlu ditampilkan sekarang. Setelah refresh yang melewati beberapa
 * ambang, hanya ambang terkecil yang ditampilkan; sisanya ikut ditandai sudah lewat.
 */
export function dueWarnings(
  remaining: number,
  shown: readonly number[],
): { show: number | null; markShown: number[] } {
  const passed = WARNING_MINUTES.filter((m) => remaining <= m * 60000 && !shown.includes(m));
  if (passed.length === 0 || remaining <= 0) return { show: null, markShown: passed };
  return { show: Math.min(...passed), markShown: passed };
}
