"use client";

import { CheckCircle2, ChevronRight, PlayCircle, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterTabs } from "@/components/layout/filter-tabs";
import { EmptyState, LoadingState, PageHeading } from "@/components/layout/state-views";
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
import { attemptKey } from "@/lib/attempt";
import { formatDate } from "@/lib/format";
import { formatDuration } from "@/lib/timer";
import { useProgressStore } from "@/stores/progress-store";
import type { AttemptMode } from "@/types";

type Filter = "all" | AttemptMode;

export function HistoryView() {
  const hydrated = useHydrated();
  const history = useProgressStore((s) => s.history);
  const activeMap = useProgressStore((s) => s.active);
  const discardAttempt = useProgressStore((s) => s.discardAttempt);
  const [filter, setFilter] = useState<Filter>("all");

  const active = useMemo(() => Object.values(activeMap), [activeMap]);
  const sorted = useMemo(() => [...history].sort((a, b) => b.finishedAt - a.finishedAt), [history]);
  const visible = sorted.filter((a) => filter === "all" || a.mode === filter);

  if (!hydrated) return <LoadingState label="Memuat riwayat..." />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeading title="Riwayat" text="Semua latihan dan simulasi yang tersimpan di browser ini." />

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Sedang dikerjakan</h2>
          <ul className="space-y-2">
            {active.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <PlayCircle className="size-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold">
                      {attempt.mode === "exam" ? "Simulasi" : "Latihan"} Paket {attempt.packageId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mulai {formatDate(attempt.startedAt)} &middot; {Object.keys(attempt.answers).length}/{attempt.order.length} terjawab
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 aria-hidden /> Buang
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Buang pengerjaan ini?</AlertDialogTitle>
                        <AlertDialogDescription>Jawaban yang tersimpan akan dihapus dan tidak masuk ke riwayat.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => discardAttempt(attemptKey(attempt.mode, attempt.packageId))}>
                          Ya, buang
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" asChild>
                    <Link href={`/${attempt.mode === "exam" ? "exam" : "practice"}/${attempt.packageId}`}>Lanjutkan</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4">
        <FilterTabs
          label="Filter mode"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Semua", count: history.length },
            { value: "exam", label: "Simulasi", count: history.filter((a) => a.mode === "exam").length },
            { value: "practice", label: "Latihan", count: history.filter((a) => a.mode === "practice").length },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat"
          text="Percobaan yang sudah selesai akan muncul di sini."
          action={
            <Button asChild>
              <Link href="/packages">Pilih paket</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((attempt) => (
            <li key={attempt.id}>
              <Link href={`/results/${attempt.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted">
                <div className="flex min-w-0 items-center gap-3">
                  {attempt.passed ? (
                    <CheckCircle2 className="size-5 shrink-0 text-answered" aria-label="Memenuhi ambang batas" />
                  ) : (
                    <XCircle className="size-5 shrink-0 text-muted-foreground" aria-label="Belum memenuhi ambang batas" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {attempt.mode === "exam" ? "Simulasi" : "Latihan"} Paket {attempt.packageId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(attempt.finishedAt)} &middot; {formatDuration(attempt.finishedAt - attempt.startedAt)}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                      TWK {attempt.result.byCategory.TWK.score} &middot; TIU {attempt.result.byCategory.TIU.score} &middot; TKP {attempt.result.byCategory.TKP.score}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold tabular-nums">{attempt.result.total}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
