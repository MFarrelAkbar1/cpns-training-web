"use client";

import { ChevronLeft, ChevronRight, Eraser, Flag, Grid3x3, LogOut } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExamCountdown } from "@/components/exam/exam-countdown";
import { LogoMark } from "@/components/layout/logo";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuestionTimer } from "@/hooks/use-question-timer";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";
import type { CompletedAttempt, FinishReason, OptionId, QuestionPackage } from "@/types";

interface ExamSessionProps {
  pkg: QuestionPackage;
  attemptKey: string;
  onFinished: (completed: CompletedAttempt) => void;
}

export function ExamSession({ pkg, attemptKey, onFinished }: ExamSessionProps) {
  const attempt = useProgressStore((s) => s.active[attemptKey]);
  const setAnswer = useProgressStore((s) => s.setAnswer);
  const toggleFlag = useProgressStore((s) => s.toggleFlag);
  const goTo = useProgressStore((s) => s.goTo);
  const markWarnings = useProgressStore((s) => s.markWarnings);
  const finishAttempt = useProgressStore((s) => s.finishAttempt);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const finished = useRef(false);

  const byNumber = useMemo(() => new Map(pkg.questions.map((q) => [q.number, q])), [pkg]);
  const items = useMemo(
    () => attempt.order.map((number, position) => ({ question: byNumber.get(number)!, position })),
    [attempt.order, byNumber],
  );

  const total = attempt.order.length;
  const index = Math.min(attempt.currentIndex, total - 1);
  const question = items[index].question;
  const answer = attempt.answers[question.number];
  const answeredCount = Object.keys(attempt.answers).length;
  const flagged = attempt.flagged.includes(question.number);

  const flushTime = useQuestionTimer(attemptKey, question.number);

  const finish = useCallback(
    (reason: FinishReason) => {
      if (finished.current) return;
      finished.current = true;
      flushTime();
      const completed = finishAttempt(attemptKey, pkg.questions, pkg.thresholds, reason);
      if (completed) onFinished(completed);
    },
    [attemptKey, finishAttempt, flushTime, onFinished, pkg],
  );

  const onWarning = useCallback(
    (minutes: number | null, markShown: number[]) => {
      markWarnings(attemptKey, markShown);
      if (minutes !== null) {
        toast.warning(`Waktu tersisa ${minutes} menit`, {
          description: "Periksa kembali soal yang belum dijawab.",
          duration: 8000,
        });
      }
    },
    [attemptKey, markWarnings],
  );

  const onExpire = useCallback(() => {
    toast.info("Waktu habis. Simulasi diselesaikan otomatis.", { duration: 8000 });
    finish("timeout");
  }, [finish]);

  const select = useCallback((position: number) => {
    goTo(attemptKey, position);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, [attemptKey, goTo]);

  const choose = (option: OptionId) => setAnswer(attemptKey, question.number, option);

  const navigator = (
    <QuestionNavigator
      items={items}
      currentNumber={question.number}
      answers={attempt.answers}
      flagged={attempt.flagged}
      grouped={!attempt.shuffled}
      onSelect={select}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="hidden truncate text-xs text-muted-foreground sm:block">CAT CPNS 2027</p>
              <p className="truncate text-sm font-semibold">{pkg.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <p className="text-right text-xs leading-tight text-muted-foreground">
              <span className="hidden sm:inline">Terjawab</span>
              <span className="block font-mono text-sm font-semibold text-foreground tabular-nums">
                {answeredCount}/{total}
              </span>
            </p>
            {attempt.deadlineAt !== null && (
              <ExamCountdown
                deadlineAt={attempt.deadlineAt}
                warningsShown={attempt.warningsShown}
                onWarning={onWarning}
                onExpire={onExpire}
              />
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-3 py-5 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:pb-6">
        <main className="min-w-0 rounded-xl border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-sm font-semibold tabular-nums">
                Soal {index + 1}
                <span className="font-normal text-muted-foreground"> / {total}</span>
              </h1>
              <CategoryBadge category={question.category} />
            </div>
            <BookmarkButton questionId={question.id} />
          </div>

          <QuestionContent question={question} />
          <div className="mt-5">
            <OptionList question={question} selected={answer} onSelect={choose} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button variant="outline" disabled={index === 0} onClick={() => select(index - 1)}>
              <ChevronLeft aria-hidden /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              aria-pressed={flagged}
              className={cn(flagged && "border-flagged bg-flagged text-flagged-foreground hover:bg-flagged/80 hover:text-flagged-foreground")}
              onClick={() => toggleFlag(attemptKey, question.number)}
            >
              <Flag aria-hidden /> Ragu-ragu
            </Button>
            {answer && (
              <Button variant="ghost" onClick={() => setAnswer(attemptKey, question.number, null)}>
                <Eraser aria-hidden /> Hapus jawaban
              </Button>
            )}
            <Button className="sm:ml-auto" disabled={index === total - 1} onClick={() => select(index + 1)}>
              Selanjutnya <ChevronRight aria-hidden />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" title="Timer tetap berjalan">
                <LogOut aria-hidden /> Keluar sementara (timer tetap berjalan)
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Selesai Ujian
            </Button>
          </div>
        </main>

        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border bg-card p-4 lg:block">
          <h2 className="mb-3 text-sm font-semibold">Nomor soal</h2>
          {navigator}
        </aside>
      </div>

      {/* Bilah bawah seluler: navigasi nomor dibuka lewat bottom sheet. */}
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
            <AlertDialogTitle>Apakah Anda yakin ingin mengakhiri simulasi?</AlertDialogTitle>
            <AlertDialogDescription>Setelah diakhiri, jawaban tidak dapat diubah lagi.</AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Summary label="Sudah dijawab" value={answeredCount} className="bg-answered-soft" />
            <Summary label="Belum dijawab" value={total - answeredCount} className="bg-muted" />
            <Summary label="Ragu-ragu" value={attempt.flagged.length} className="bg-flagged-soft" />
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali ke soal</AlertDialogCancel>
            <AlertDialogAction onClick={() => finish("user")}>Ya, akhiri simulasi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Summary({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cn("rounded-lg p-3", className)}>
      <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs">{label}</dt>
    </div>
  );
}
