import type { Metadata } from "next";
import { ReviewView } from "@/components/results/review-view";
import { parseReviewFilter } from "@/lib/review-filters";

export const metadata: Metadata = { title: "Review Jawaban", robots: { index: false } };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { attemptId } = await params;
  const { filter } = await searchParams;
  return <ReviewView attemptId={attemptId} initialFilter={parseReviewFilter(filter)} />;
}
