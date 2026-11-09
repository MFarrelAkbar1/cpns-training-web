import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/state-views";
import { PackageGrid } from "@/components/packages/package-grid";

export const metadata: Metadata = { title: "Mode Latihan" };

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeading
        title="Mode Latihan"
        text="Belajar tanpa timer. Setiap jawaban langsung disertai kunci, skor, dan pembahasan lengkap."
      />
      <PackageGrid mode="practice" />
    </div>
  );
}
