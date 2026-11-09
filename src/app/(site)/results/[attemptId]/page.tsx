import type { Metadata } from "next";
import { ResultView } from "@/components/results/result-view";

export const metadata: Metadata = { title: "Hasil", robots: { index: false } };

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <ResultView attemptId={attemptId} />;
}
