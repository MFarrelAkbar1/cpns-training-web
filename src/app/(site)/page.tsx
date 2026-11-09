import {
  BarChart3,
  BookOpenCheck,
  Bookmark,
  ClipboardCheck,
  History,
  Save,
  TimerReset,
} from "lucide-react";
import Link from "next/link";
import { CATEGORY_INFO, CategoryBadge } from "@/components/questions/category-badge";
import { Button } from "@/components/ui/button";
import { PACKAGES, TOTAL_QUESTIONS } from "@/lib/question-loader";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const CATEGORIES: { id: Category; count: number; max: number; scoring: string; topics: string[] }[] = [
  {
    id: "TWK",
    count: 30,
    max: 150,
    scoring: "Benar 5, salah atau kosong 0",
    topics: ["Nasionalisme", "Integritas", "Bela Negara", "Pilar Negara", "Bahasa Indonesia"],
  },
  {
    id: "TIU",
    count: 35,
    max: 175,
    scoring: "Benar 5, salah atau kosong 0",
    topics: ["Verbal", "Numerik", "Kecukupan data", "Figural"],
  },
  {
    id: "TKP",
    count: 45,
    max: 225,
    scoring: "Bobot 1 sampai 5 tiap pilihan, kosong 0",
    topics: ["Pelayanan Publik", "Jejaring Kerja", "Sosial Budaya", "TIK", "Profesionalisme", "Anti Radikalisme"],
  },
];

const FEATURES = [
  { icon: TimerReset, title: "Timer anti-meleset", text: "Waktu dihitung dari batas absolut, tetap akurat saat halaman dimuat ulang atau ditinggalkan." },
  { icon: Save, title: "Simpan otomatis", text: "Setiap jawaban langsung tersimpan. Simulasi yang terputus bisa dilanjutkan dari soal terakhir." },
  { icon: BookOpenCheck, title: "Pembahasan lengkap", text: "Setiap soal memiliki pembahasan, kunci jawaban, dan bobot TKP sesuai naskah sumber." },
  { icon: BarChart3, title: "Analisis per kategori", text: "Lihat perkembangan skor dan kategori yang paling perlu ditingkatkan." },
  { icon: Bookmark, title: "Bookmark dan ragu-ragu", text: "Tandai soal favorit dan soal yang ingin ditinjau kembali." },
  { icon: History, title: "Riwayat pengerjaan", text: "Semua percobaan tersimpan, lengkap dengan review jawaban per soal." },
];

const STEPS = [
  { title: "Pilih paket", text: "Tersedia 10 paket, masing-masing 110 soal dengan komposisi SKD." },
  { title: "Latihan atau simulasi", text: "Belajar santai dengan feedback langsung, atau uji diri dalam 100 menit." },
  { title: "Pelajari hasilnya", text: "Baca pembahasan, lihat skor per kategori, lalu ulangi yang masih lemah." },
];

/** Pola isian contoh pada ilustrasi lembar jawaban: indeks pilihan per nomor. */
const SHEET_FILL = [4, 1, 2, 3, 3, 1, 4, 2, 1, 2, 4, 3, 1, 0, 2, 1, 4, 3, 0, 2, 3];

function AnswerSheet() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-hidden>
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Lembar jawaban</span>
        <span className="font-mono text-xs text-muted-foreground">Paket S1</span>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-2">
        {SHEET_FILL.map((filled, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-5 text-right font-mono text-[0.65rem] text-muted-foreground tabular-nums">{i + 1}</span>
            {["A", "B", "C", "D", "E"].map((letter, j) => (
              <span key={letter} data-filled={j === filled} className="ljk-bubble size-4 text-[0.5rem] font-semibold sm:size-[1.15rem]">
                {letter}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="mb-4 text-sm font-semibold text-primary">Seleksi Kompetensi Dasar CPNS</p>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
              Persiapkan Dirimu Menghadapi SKD CPNS 2027
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Latih TWK, TIU, dan TKP dengan pembahasan lengkap, lalu uji kesiapanmu lewat simulasi CAT 100 menit
              dengan penilaian otomatis.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/practice">Mulai Latihan</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/exam">Simulasi CAT</Link>
              </Button>
            </div>
            <dl className="mt-10 flex gap-8 sm:gap-12">
              <Stat label="Paket soal" value={String(PACKAGES.length)} />
              <Stat label="Total soal" value={TOTAL_QUESTIONS.toLocaleString("id-ID")} />
              <Stat label="Skor maksimal" value="550" />
            </dl>
          </div>
          <AnswerSheet />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Tiga bagian tes SKD</h2>
        <p className="mt-2 text-muted-foreground">Setiap paket mengikuti komposisi dan cara penilaian yang sama.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <article key={c.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <CategoryBadge category={c.id} />
                <span className="font-mono text-sm text-muted-foreground tabular-nums">{c.count} soal</span>
              </div>
              <h3 className="mt-3 font-semibold">{CATEGORY_INFO[c.id].name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.scoring}. Skor maksimal {c.max}.
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {c.topics.map((topic) => (
                  <li key={topic} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {topic}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Fitur unggulan</h2>
          <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-3">
                <feature.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Cara menggunakan</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span data-filled="true" className={cn("ljk-bubble size-9 shrink-0 font-mono text-sm font-semibold")}>
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button className="mt-10" size="lg" asChild>
          <Link href="/packages">
            <ClipboardCheck aria-hidden /> Lihat semua paket
          </Link>
        </Button>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
