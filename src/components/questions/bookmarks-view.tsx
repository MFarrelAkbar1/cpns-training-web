"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FilterTabs } from "@/components/layout/filter-tabs";
import { EmptyState, LoadingState, PageHeading } from "@/components/layout/state-views";
import { AnswerFeedback } from "@/components/questions/answer-feedback";
import { BookmarkButton } from "@/components/questions/bookmark-button";
import { CategoryBadge } from "@/components/questions/category-badge";
import { OptionList } from "@/components/questions/option-list";
import { QuestionContent } from "@/components/questions/question-content";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { loadPackage } from "@/lib/question-loader";
import { useProgressStore } from "@/stores/progress-store";
import type { Category, Question } from "@/types";

type Filter = "all" | Category;

export function BookmarksView() {
  const hydrated = useHydrated();
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const [loaded, setLoaded] = useState<Map<string, Question>>(new Map());
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  // ID soal berawalan paket ("S3-TWK-001"), jadi hanya paket yang dibutuhkan yang dimuat.
  const packageIds = useMemo(() => [...new Set(bookmarks.map((id) => id.split("-")[0]))].sort().join(), [bookmarks]);

  useEffect(() => {
    if (!packageIds) return;
    let cancelled = false;
    Promise.all(packageIds.split(",").map(loadPackage)).then(
      (packages) => {
        if (cancelled) return;
        setLoaded(new Map(packages.flatMap((p) => p.questions.map((q) => [q.id, q] as const))));
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [packageIds]);

  if (!hydrated) return <LoadingState label="Memuat bookmark..." />;

  const questions = bookmarks.flatMap((id) => {
    const question = loaded.get(id);
    return question ? [question] : [];
  });
  const stillLoading = !failed && questions.length < bookmarks.length;
  const visible = questions.filter((q) => filter === "all" || q.category === filter);
  const count = (c: Category) => questions.filter((q) => q.category === c).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeading title="Bookmark" text="Soal favorit yang Anda simpan, lengkap dengan kunci dan pembahasannya." />
      {bookmarks.length === 0 ? (
        <EmptyState
          title="Belum ada bookmark"
          text="Tekan tombol Bookmark pada soal mana pun untuk menyimpannya di sini."
          action={
            <Button asChild>
              <Link href="/practice">Mulai Latihan</Link>
            </Button>
          }
        />
      ) : (
        <>
          <FilterTabs
            label="Filter kategori"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Semua", count: questions.length },
              { value: "TWK", label: "TWK", count: count("TWK") },
              { value: "TIU", label: "TIU", count: count("TIU") },
              { value: "TKP", label: "TKP", count: count("TKP") },
            ]}
          />
          {failed && <p className="mt-4 text-sm text-destructive">Sebagian soal gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.</p>}
          {stillLoading && <LoadingState label="Memuat soal..." />}
          <ul className="mt-6 space-y-4">
            {visible.map((question) => (
              <li key={question.id} className="review-item rounded-xl border bg-card p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-mono text-sm font-semibold tabular-nums">
                      Paket {question.packageId} &middot; No. {question.number}
                    </h2>
                    <CategoryBadge category={question.category} />
                  </div>
                  <BookmarkButton questionId={question.id} />
                </div>
                <QuestionContent question={question} />
                <div className="mt-5">
                  <OptionList question={question} selected={undefined} reveal />
                </div>
                <div className="mt-5">
                  <AnswerFeedback question={question} answer={undefined} showVerdict={false} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
