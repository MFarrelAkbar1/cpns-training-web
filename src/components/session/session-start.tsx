"use client";

import { ArrowLeft, Check, Shuffle } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createAttempt } from "@/lib/attempt";
import { useProgressStore } from "@/stores/progress-store";
import type { AttemptMode, QuestionPackage } from "@/types";

const RULES: Record<AttemptMode, { title: string; points: string[] }> = {
  exam: {
    title: "Simulasi CAT",
    points: [
      "Durasi 100 menit untuk 110 soal. Timer tetap berjalan meski halaman ditutup.",
      "Jawaban tersimpan otomatis dan simulasi dapat dilanjutkan selama waktunya masih ada.",
      "Kunci jawaban dan pembahasan baru terbuka setelah simulasi selesai.",
      "Saat waktu habis, simulasi selesai otomatis dengan jawaban yang sudah tersimpan.",
    ],
  },
  practice: {
    title: "Mode Latihan",
    points: [
      "Tanpa timer. Kerjakan sesuai kecepatan Anda.",
      "Setelah menjawab, kunci, skor, dan pembahasan langsung tampil.",
      "Jawaban dapat diubah kapan saja dan progres tersimpan otomatis.",
    ],
  },
};

export function SessionStart({ pkg, mode }: { pkg: QuestionPackage; mode: AttemptMode }) {
  const startAttempt = useProgressStore((s) => s.startAttempt);
  const [shuffle, setShuffle] = useState(false);
  const switchId = useId();
  const rules = RULES[mode];

  const start = () =>
    startAttempt(
      createAttempt({
        packageId: pkg.id,
        mode,
        questionNumbers: pkg.questions.map((q) => q.number),
        shuffle,
        now: Date.now(),
      }),
    );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link href={mode === "exam" ? "/exam" : "/practice"}>
              <ArrowLeft aria-hidden /> Pilih paket lain
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-sm font-semibold text-primary">{rules.title}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{pkg.name}</h1>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Soal" value={String(pkg.questions.length)} />
          <Fact label="TWK / TIU / TKP" value="30 / 35 / 45" />
          <Fact label="Waktu" value={mode === "exam" ? `${pkg.durationMinutes} menit` : "Bebas"} />
          <Fact label="Skor maksimal" value="550" />
        </dl>

        <ul className="mt-6 space-y-2.5">
          {rules.points.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-answered" aria-hidden />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <label htmlFor={switchId} className="cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Shuffle className="size-4" aria-hidden /> Acak urutan soal
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Bawaan mengikuti urutan naskah. Urutan pilihan A-E tidak diacak agar sesuai dengan pembahasan.
            </span>
          </label>
          <Switch id={switchId} checked={shuffle} onCheckedChange={setShuffle} />
        </div>

        <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={start}>
          {mode === "exam" ? "Mulai Simulasi" : "Mulai Latihan"}
        </Button>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
