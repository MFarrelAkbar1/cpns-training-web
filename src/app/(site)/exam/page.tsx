import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/state-views";
import { PackageGrid } from "@/components/packages/package-grid";

export const metadata: Metadata = { title: "Simulasi CAT" };

export default function ExamPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeading
        title="Simulasi CAT"
        text="110 soal dalam 100 menit dengan timer berjalan. Kunci jawaban baru terbuka setelah simulasi selesai."
      />
      <PackageGrid mode="exam" />
    </div>
  );
}
