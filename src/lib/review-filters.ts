/** Terpisah dari komponen klien agar bisa dibaca halaman server saat memvalidasi query. */
export const REVIEW_FILTERS = ["all", "TWK", "TIU", "TKP", "incorrect", "blank", "flagged"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export function parseReviewFilter(value: string | undefined): ReviewFilter {
  return (REVIEW_FILTERS as readonly string[]).includes(value ?? "") ? (value as ReviewFilter) : "all";
}
