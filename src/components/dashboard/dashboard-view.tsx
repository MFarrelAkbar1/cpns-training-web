"use client";

import { Lightbulb, PlayCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { CategoryPerformanceChart, ScoreTrendChart } from "@/components/charts";
import { EmptyState, LoadingState, PageHeading } from "@/components/layout/state-views";
import { CATEGORY_INFO } from "@/components/questions/category-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatDate, formatShortDate } from "@/lib/format";
import { PACKAGES, THRESHOLDS } from "@/lib/question-loader";
import { dashboardStats } from "@/lib/stats";
import { useProgressStore } from "@/stores/progress-store";

export function DashboardView() {
  const hydrated = useHydrated();
  const history = useProgressStore((s) => s.history);
  const activeMap = useProgressStore((s) => s.active);
  const resetAll = useProgressStore((s) => s.resetAll);

  const stats = useMemo(() => dashboardStats(history, THRESHOLDS), [history]);
  const active = useMemo(() => Object.values(activeMap), [activeMap]);
  const recent = useMemo(() => [...history].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 5), [history]);

  if (!hydrated) return <LoadingState label="Memuat progres..." />;

  const isEmpty = history.length === 0 && active.length === 0;
  const performance = stats.categories.flatMap((c) =>
    c.percent === null ? [] : [{ category: c.category, percent: c.percent, answered: c.answered }],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeading title="Dashboard" text="Ringkasan progres belajar yang tersimpan di browser ini.">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isEmpty}>
              <Trash2 aria-hidden /> Reset progres
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus seluruh progres?</AlertDialogTitle>
              <AlertDialogDescription>
                Riwayat, simulasi yang sedang berjalan, dan bookmark akan dihapus permanen dari browser ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  resetAll();
                  toast.success("Progres telah direset.");
                }}
              >
                Ya, hapus semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeading>

      {active.length > 0 && (
        <section aria-label="Sedang dikerjakan" className="mb-6 space-y-2">
          {active.map((attempt) => (
            <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-accent p-4">
              <div className="flex items-center gap-3">
                <PlayCircle className="size-5 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">
                    {attempt.mode === "exam" ? "Simulasi" : "Latihan"} Paket {attempt.packageId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(attempt.answers).length}/{attempt.order.length} terjawab
                  </p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link href={`/${attempt.mode === "exam" ? "exam" : "practice"}/${attempt.packageId}`}>Lanjutkan</Link>
              </Button>
            </div>
          ))}
        </section>
      )}

      {isEmpty ? (
        <EmptyState
          title="Belum ada progres"
          text="Selesaikan latihan atau simulasi pertama Anda untuk melihat statistik di sini."
          action={
            <>
              <Button asChild>
                <Link href="/practice">Mulai Latihan</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/exam">Simulasi CAT</Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Soal dikerjakan" value={stats.answeredTotal.toLocaleString("id-ID")} note="Dari percobaan yang selesai" />
            <Tile label="Jawaban benar" value={stats.correctTotal.toLocaleString("id-ID")} note="TWK dan TIU" />
            <Tile label="Rata-rata skor" value={stats.averageScore === null ? "-" : String(Math.round(stats.averageScore))} note={`Dari ${stats.examCount} simulasi, maksimal 550`} />
            <Tile label="Paket diselesaikan" value={`${stats.completedPackages}/${PACKAGES.length}`} note="Latihan atau simulasi" />
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Perkembangan skor simulasi</h2>
              {stats.trend.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Selesaikan simulasi untuk melihat grafik perkembangan skor.</p>
              ) : (
                <div className="mt-4">
                  <ScoreTrendChart
                    threshold={THRESHOLDS.Total}
                    data={stats.trend.map((t) => ({
                      label: t.label,
                      packageId: t.packageId,
                      date: formatShortDate(t.finishedAt),
                      score: t.score,
                    }))}
                  />
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Performa per kategori</h2>
              <p className="mt-1 text-xs text-muted-foreground">Capaian skor pada soal yang dijawab.</p>
              {performance.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada data.</p>
              ) : (
                <div className="mt-4">
                  <CategoryPerformanceChart data={performance} />
                </div>
              )}
              {stats.recommendation && (
                <div className="mt-4 flex gap-2.5 rounded-lg bg-muted p-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div className="text-sm">
                    <p className="font-semibold">Fokus berikutnya: {stats.recommendation}</p>
                    <p className="text-muted-foreground">
                      {CATEGORY_INFO[stats.recommendation].name} paling dekat dengan atau di bawah ambang batasnya.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Riwayat terakhir</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/history">Semua riwayat</Link>
              </Button>
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Belum ada percobaan yang selesai.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {recent.map((attempt) => (
                  <li key={attempt.id}>
                    <Link href={`/results/${attempt.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-muted">
                      <span>
                        <span className="block text-sm font-medium">
                          {attempt.mode === "exam" ? "Simulasi" : "Latihan"} Paket {attempt.packageId}
                        </span>
                        <span className="block text-xs text-muted-foreground">{formatDate(attempt.finishedAt)}</span>
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {attempt.result.total}/{attempt.result.max}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</dd>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
