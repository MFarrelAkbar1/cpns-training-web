"use client";

import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterTabs } from "@/components/layout/filter-tabs";
import { EmptyState, LoadingState } from "@/components/layout/state-views";
import { AnswerFeedback } from "@/components/questions/answer-feedback";
import { BookmarkButton } from "@/components/questions/bookmark-button";
import { CategoryBadge } from "@/components/questions/category-badge";
import { OptionList } from "@/components/questions/option-list";
import { QuestionContent } from "@/components/questions/question-content";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePackage } from "@/hooks/use-package";
import { REVIEW_FILTERS, type ReviewFilter } from "@/lib/review-filters";
import { isCorrect } from "@/lib/scoring";
import { useProgressStore } from "@/stores/progress-store";
import type { CompletedAttempt, Question } from "@/types";

const LABELS: Record<ReviewFilter, string> = {
  all: "Semua",
  TWK: "TWK",
  TIU: "TIU",
  TKP: "TKP",
  incorrect: "Salah dan kosong",
  blank: "Kosong",
  flagged: "Ragu-ragu",
};

function matches(filter: ReviewFilter, question: Question, attempt: CompletedAttempt): boolean {
  const answer = attempt.answers[question.number];
  switch (filter) {
    case "all":
      return true;
    case "blank":
      return !answer;
    case "flagged":
      return attempt.flagged.includes(question.number);
    case "incorrect":
      // TKP tanpa status salah: yang masih bisa ditingkatkan adalah bobot di bawah maksimum.
      if (!answer) return true;
      if (question.category === "TKP") return question.optionScores?.[answer] !== 5;
      return isCorrect(question, answer) === false;
    default:
      return question.category === filter;
  }
}

export function ReviewView({ attemptId, initialFilter }: { attemptId: string; initialFilter: ReviewFilter }) {
  const hydrated = useHydrated();
  const attempt = useProgressStore((s) => s.history.find((a) => a.id === attemptId));

  if (!hydrated) return <LoadingState />;
  if (!attempt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Hasil tidak ditemukan"
          text="Hasil hanya tersimpan di browser tempat Anda mengerjakannya."
          action={
            <Button asChild>
              <Link href="/history">Lihat riwayat</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return <ReviewList attempt={attempt} initialFilter={initialFilter} />;
}

function ReviewList({ attempt, initialFilter }: { attempt: CompletedAttempt; initialFilter: ReviewFilter }) {
  const { data: pkg, error, retry } = usePackage(attempt.packageId);
  const [filter, setFilter] = useState<ReviewFilter>(initialFilter);

  const counts = useMemo(() => {
    const result = {} as Record<ReviewFilter, number>;
    for (const f of REVIEW_FILTERS) {
      result[f] = pkg ? pkg.questions.filter((q) => matches(f, q, attempt)).length : 0;
    }
    return result;
  }, [pkg, attempt]);

  const visible = useMemo(() => (pkg ? pkg.questions.filter((q) => matches(filter, q, attempt)) : []), [pkg, filter, attempt]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
        <Link href={`/results/${attempt.id}`}>
          <ArrowLeft aria-hidden /> Ringkasan hasil
        </Link>
      </Button>
      <h1 className="text-3xl font-bold tracking-tight">Review Paket {attempt.packageId}</h1>
      <p className="mt-2 text-muted-foreground">Jawaban Anda, kunci atau bobot, dan pembahasan setiap soal.</p>

      <div className="sticky top-16 z-20 -mx-4 mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <FilterTabs
          label="Filter review"
          value={filter}
          onChange={setFilter}
          options={REVIEW_FILTERS.map((f) => ({ value: f, label: LABELS[f], count: counts[f] }))}
        />
      </div>

      {error && (
        <div className="mt-6">
          <EmptyState title="Data paket gagal dimuat" text="Periksa koneksi internet, lalu coba lagi." action={<Button onClick={retry}>Coba lagi</Button>} />
        </div>
      )}
      {!pkg && !error && <LoadingState label="Memuat soal..." />}
      {pkg && visible.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Tidak ada soal" text="Tidak ada soal yang cocok dengan filter ini." />
        </div>
      )}

      <ol className="mt-6 space-y-4">
        {visible.map((question) => {
          const answer = attempt.answers[question.number];
          return (
            <li key={question.id} className="review-item rounded-xl border bg-card p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-mono text-sm font-semibold tabular-nums">No. {question.number}</h2>
                  <CategoryBadge category={question.category} />
                  {question.topic && <span className="text-xs text-muted-foreground">{question.topic}</span>}
                  {attempt.flagged.includes(question.number) && (
                    <span className="flex items-center gap-1 rounded-md bg-flagged-soft px-2 py-1 text-xs font-medium">
                      <Flag className="size-3" aria-hidden /> Ragu-ragu
                    </span>
                  )}
                </div>
                <BookmarkButton questionId={question.id} />
              </div>
              <QuestionContent question={question} />
              <div className="mt-5">
                <OptionList question={question} selected={answer} reveal />
              </div>
              <div className="mt-5">
                <AnswerFeedback question={question} answer={answer} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
