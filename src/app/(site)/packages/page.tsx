import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/state-views";
import { PackageGrid } from "@/components/packages/package-grid";

export const metadata: Metadata = { title: "Paket Soal" };

export default function PackagesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeading title="Paket Soal" text="Sepuluh paket SKD, masing-masing 110 soal dengan durasi 100 menit." />
      <PackageGrid />
    </div>
  );
}
