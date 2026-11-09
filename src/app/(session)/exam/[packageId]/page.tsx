import type { Metadata } from "next";
import { SessionRoute } from "@/components/session/session-route";
import { PACKAGE_IDS } from "@/lib/question-loader";

export const dynamicParams = false;

export function generateStaticParams() {
  return PACKAGE_IDS.map((packageId) => ({ packageId }));
}

export async function generateMetadata({ params }: { params: Promise<{ packageId: string }> }): Promise<Metadata> {
  const { packageId } = await params;
  return { title: `Simulasi CAT Paket ${packageId}`, robots: { index: false } };
}

export default async function ExamSessionPage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  return <SessionRoute packageId={packageId} mode="exam" />;
}
