"use client";

import { AlertTriangle, ArrowLeft, BookOpenText, CheckCircle2, ListChecks, RotateCcw, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import Link from "next/link";
import { CategoryScoreChart } from "@/components/charts";
import { EmptyState, LoadingState } from "@/components/layout/state-views";
import { CATEGORY_INFO, CategoryBadge } from "@/components/questions/category-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHydrated } from "@/hooks/use-hydrated";
import { averageTimePerQuestion } from "@/lib/attempt";
import { formatDate } from "@/lib/format";
import { THRESHOLDS } from "@/lib/question-loader";
import { CATEGORIES, rankCategories } from "@/lib/scoring";
import { formatDuration } from "@/lib/timer";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";

export function ResultView({ attemptId }: { attemptId: string }) {
  const hydrated = useHydrated();
  const attempt = useProgressStore((s) => s.history.find((a) => a.id === attemptId));

  if (!hydrated) return <LoadingState />;
  if (!attempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Hasil tidak ditemukan"
          text="Hasil hanya tersimpan di browser tempat Anda mengerjakannya, dan akan hilang bila progres direset."
          action={
            <Button asChild>
              <Link href="/history">Lihat riwayat</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { result } = attempt;
  const { best, worst } = rankCategories(result);
  const completion = Math.round((result.answered / (result.answered + result.blank)) * 100);
  const average = averageTimePerQuestion(attempt);
  const failed = CATEGORIES.filter((c) => result.byCategory[c].score < THRESHOLDS[c]);
  const sessionPath = attempt.mode === "exam" ? "/exam" : "/practice";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
        <Link href="/history">
          <ArrowLeft aria-hidden /> Riwayat
        </Link>
      </Button>

      <section className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              {attempt.mode === "exam" ? "Hasil Simulasi CAT" : "Hasil Latihan"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Paket {attempt.packageId}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDate(attempt.finishedAt)} &middot; Waktu pengerjaan {formatDuration(attempt.finishedAt - attempt.startedAt)}
            </p>
            {attempt.finishReason === "timeout" && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle className="size-4" aria-hidden /> Selesai otomatis karena waktu habis
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-5xl font-bold tracking-tight tabular-nums">
              {result.total}
              <span className="text-xl font-medium text-muted-foreground">/{result.max}</span>
            </p>
            <p className={cn("mt-2 flex items-center gap-1.5 text-sm font-semibold sm:justify-end", attempt.passed ? "text-answered" : "text-destructive")}>
              {attempt.passed ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
              {attempt.passed ? "Memenuhi ambang batas acuan" : `Belum memenuhi ambang ${failed.join(", ")}`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t pt-6">
          <Button asChild>
            <Link href={`/results/${attempt.id}/review?filter=incorrect`}>
              <BookOpenText aria-hidden /> Lihat pembahasan
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/results/${attempt.id}/review`}>
              <ListChecks aria-hidden /> Review semua jawaban
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${sessionPath}/${attempt.packageId}`}>
              <RotateCcw aria-hidden /> Ulangi paket
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Skor per kategori</h2>
          <div className="mt-4 space-y-5">
            {CATEGORIES.map((category) => {
              const c = result.byCategory[category];
              return (
                <div key={category}>
                  <div className="flex items-center justify-between gap-2">
                    <CategoryBadge category={category} />
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <Progress className="mt-2" value={(c.score / c.max) * 100} aria-label={`Skor ${category}`} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {CATEGORY_INFO[category].name}: {c.answered} dijawab, {c.blank} kosong
                    {category !== "TKP" && `, ${c.correct} benar`}. Ambang {THRESHOLDS[category]}.
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Skor dan ambang batas</h2>
          <div className="mt-4">
            <CategoryScoreChart
              data={CATEGORIES.map((category) => ({
                category,
                score: result.byCategory[category].score,
                threshold: THRESHOLDS[category],
                max: result.byCategory[category].max,
              }))}
            />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Analisis</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<TrendingUp className="size-4 text-answered" aria-hidden />} label="Kategori terbaik" value={best} note="Persentase skor tertinggi" />
          <Metric icon={<TrendingDown className="size-4 text-destructive" aria-hidden />} label="Perlu ditingkatkan" value={worst} note="Persentase skor terendah" />
          <Metric label="Rata-rata waktu per soal" value={average === null ? "-" : formatDuration(average)} note="Dari soal yang dibuka" />
          <Metric label="Penyelesaian" value={`${completion}%`} note={`${result.answered} dijawab, ${result.blank} kosong`} />
        </dl>
        <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
          Ambang batas {THRESHOLDS.TWK}/{THRESHOLDS.TIU}/{THRESHOLDS.TKP} adalah acuan formasi umum pada naskah sumber.
          Ketiganya harus terpenuhi. Nilai resmi ditetapkan ulang setiap tahun, jadi periksa ketentuan tahun berjalan.
        </p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon?: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</dd>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
