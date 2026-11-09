/** Hanya dipanggil setelah hydration, sehingga zona waktu pengguna tidak memicu mismatch. */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(timestamp);
}
