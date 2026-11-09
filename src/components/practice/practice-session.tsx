"use client";

import { ChevronLeft, ChevronRight, Flag, Grid3x3, LogOut } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FilterTabs } from "@/components/layout/filter-tabs";
import { LogoMark } from "@/components/layout/logo";
import { AnswerFeedback } from "@/components/questions/answer-feedback";
import { BookmarkButton } from "@/components/questions/bookmark-button";
import { CategoryBadge } from "@/components/questions/category-badge";
import { OptionList } from "@/components/questions/option-list";
import { QuestionContent } from "@/components/questions/question-content";
import { QuestionNavigator } from "@/components/questions/question-navigator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuestionTimer } from "@/hooks/use-question-timer";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";
import type { Category, CompletedAttempt, QuestionPackage } from "@/types";

type Filter = "all" | Category | "flagged";

interface PracticeSessionProps {
  pkg: QuestionPackage;
  attemptKey: string;
  onFinished: (completed: CompletedAttempt) => void;
}

export function PracticeSession({ pkg, attemptKey, onFinished }: PracticeSessionProps) {
  const attempt = useProgressStore((s) => s.active[attemptKey]);
  const setAnswer = useProgressStore((s) => s.setAnswer);
  const toggleFlag = useProgressStore((s) => s.toggleFlag);
  const goTo = useProgressStore((s) => s.goTo);
  const finishAttempt = useProgressStore((s) => s.finishAttempt);

  const [filter, setFilter] = useState<Filter>("all");
  const [navOpen, setNavOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const byNumber = useMemo(() => new Map(pkg.questions.map((q) => [q.number, q])), [pkg]);
  const allItems = useMemo(
    () => attempt.order.map((number, position) => ({ question: byNumber.get(number)!, position })),
    [attempt.order, byNumber],
  );
  const items = useMemo(
    () =>
      allItems.filter(({ question }) => {
        if (filter === "all") return true;
        if (filter === "flagged") return attempt.flagged.includes(question.number);
        return question.category === filter;
      }),
    [allItems, filter, attempt.flagged],
  );

  const position = Math.min(attempt.currentIndex, allItems.length - 1);
  const question = allItems[position].question;
  const answer = attempt.answers[question.number];
  const flagged = attempt.flagged.includes(question.number);
  const answeredCount = Object.keys(attempt.answers).length;
  const total = allItems.length;

  // Tombol sebelumnya/selanjutnya bergerak di dalam hasil filter.
  const filteredIndex = items.findIndex((item) => item.position === position);
  const previous = filteredIndex > 0 ? items[filteredIndex - 1].position : filteredIndex === -1 ? items.findLast((i) => i.position < position)?.position : undefined;
  const next =
    filteredIndex !== -1 && filteredIndex < items.length - 1
      ? items[filteredIndex + 1].position
      : filteredIndex === -1
        ? items.find((i) => i.position > position)?.position
        : undefined;

  const flushTime = useQuestionTimer(attemptKey, question.number);

  const select = useCallback(
    (target: number) => {
      goTo(attemptKey, target);
      setNavOpen(false);
      window.scrollTo({ top: 0 });
    },
    [attemptKey, goTo],
  );

  const changeFilter = (value: Filter) => {
    setFilter(value);
    const matches = allItems.filter(({ question: q }) =>
      value === "all" ? true : value === "flagged" ? attempt.flagged.includes(q.number) : q.category === value,
    );
    if (matches.length && !matches.some((m) => m.position === position)) select(matches[0].position);
  };

  const finish = () => {
    flushTime();
    const completed = finishAttempt(attemptKey, pkg.questions, pkg.thresholds, "user");
    if (completed) onFinished(completed);
  };

  const navigator = (
    <>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada soal pada filter ini.</p>
      ) : (
        <QuestionNavigator
          items={items}
          currentNumber={question.number}
          answers={attempt.answers}
          flagged={attempt.flagged}
          grouped={!attempt.shuffled}
          onSelect={select}
        />
      )}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs text-muted-foreground">Mode Latihan</p>
              <p className="truncate text-sm font-semibold">{pkg.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden w-40 sm:block">
              <Progress value={(answeredCount / total) * 100} aria-label="Progres latihan" />
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {answeredCount}/{total}
            </span>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
              Selesai
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-3 py-5 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:pb-6">
        <div className="min-w-0 space-y-4">
          <FilterTabs
            label="Filter soal"
            value={filter}
            onChange={changeFilter}
            options={[
              { value: "all", label: "Semua" },
              { value: "TWK", label: "TWK" },
              { value: "TIU", label: "TIU" },
              { value: "TKP", label: "TKP" },
              { value: "flagged", label: "Ditandai", count: attempt.flagged.length },
            ]}
          />
          <main className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-sm font-semibold tabular-nums">
                  Soal {position + 1}
                  <span className="font-normal text-muted-foreground"> / {total}</span>
                </h1>
                <CategoryBadge category={question.category} />
                {question.topic && <span className="text-xs text-muted-foreground">{question.topic}</span>}
              </div>
              <BookmarkButton questionId={question.id} />
            </div>

            <QuestionContent question={question} />
            <div className="mt-5">
              <OptionList
                question={question}
                selected={answer}
                reveal={answer !== undefined}
                onSelect={(option) => setAnswer(attemptKey, question.number, option)}
              />
            </div>
            {answer && (
              <div className="mt-5">
                <AnswerFeedback question={question} answer={answer} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
              <Button variant="outline" disabled={previous === undefined} onClick={() => previous !== undefined && select(previous)}>
                <ChevronLeft aria-hidden /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                aria-pressed={flagged}
                className={cn(flagged && "border-flagged bg-flagged text-flagged-foreground hover:bg-flagged/80 hover:text-flagged-foreground")}
                onClick={() => toggleFlag(attemptKey, question.number)}
              >
                <Flag aria-hidden /> Tandai
              </Button>
              <Button className="sm:ml-auto" disabled={next === undefined} onClick={() => next !== undefined && select(next)}>
                Selanjutnya <ChevronRight aria-hidden />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-3" asChild>
              <Link href="/dashboard">
                <LogOut aria-hidden /> Keluar, progres tersimpan
              </Link>
            </Button>
          </main>
        </div>

        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border bg-card p-4 lg:block">
          <h2 className="mb-3 text-sm font-semibold">Nomor soal</h2>
          {navigator}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Grid3x3 aria-hidden /> Nomor soal
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nomor soal</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{navigator}</div>
          </SheetContent>
        </Sheet>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan latihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredCount} dari {total} soal sudah dijawab. Hasilnya akan masuk ke riwayat dan soal yang kosong bernilai 0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut latihan</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Selesaikan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
