"use client";

import { Check, X } from "lucide-react";
import { FigureImage } from "@/components/questions/question-content";
import { cn } from "@/lib/utils";
import type { OptionId, Question } from "@/types";

interface OptionListProps {
  question: Question;
  selected: OptionId | undefined;
  onSelect?: (option: OptionId) => void;
  /** Tampilkan kunci/bobot. Selalu false selama simulasi berlangsung. */
  reveal?: boolean;
}

export function OptionList({ question, selected, onSelect, reveal = false }: OptionListProps) {
  const hasImages = question.options.some((o) => o.image);
  const groupLabel = `Pilihan jawaban soal nomor ${question.number}`;

  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      className={cn(hasImages ? "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" : "space-y-2.5")}
    >
      {question.options.map((option) => {
        const isSelected = selected === option.id;
        const score = question.optionScores?.[option.id];
        const isKey = question.correctAnswer === option.id;
        const showCorrect = reveal && isKey;
        const showWrong = reveal && isSelected && question.correctAnswer !== null && !isKey;

        const stateClass = showCorrect
          ? "border-answered bg-answered-soft"
          : showWrong
            ? "border-destructive bg-wrong-soft"
            : isSelected
              ? "border-primary bg-accent"
              : "border-border bg-card hover:border-ring/60 hover:bg-muted/60";

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={!onSelect}
            onClick={() => onSelect?.(option.id)}
            className={cn(
              "group flex w-full gap-3 rounded-xl border-[1.5px] p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
              hasImages ? "flex-col items-center" : "items-start",
              stateClass,
            )}
          >
            <span className={cn("flex items-center gap-2", hasImages && "w-full justify-between")}>
              <span
                data-filled={isSelected}
                className="ljk-bubble size-7 shrink-0 font-mono text-xs font-semibold"
                aria-hidden={false}
              >
                {option.id}
              </span>
              {hasImages && reveal && <RevealMark correct={showCorrect} wrong={showWrong} score={score} />}
            </span>
            {option.image ? (
              <FigureImage image={option.image} />
            ) : (
              <span className="min-w-0 flex-1 pt-0.5 text-[0.95rem] leading-relaxed">{option.text}</span>
            )}
            {!hasImages && reveal && <RevealMark correct={showCorrect} wrong={showWrong} score={score} />}
          </button>
        );
      })}
    </div>
  );
}

function RevealMark({ correct, wrong, score }: { correct: boolean; wrong: boolean; score: number | undefined }) {
  if (score !== undefined) {
    return (
      <span className="shrink-0 rounded-md bg-secondary px-2 py-1 font-mono text-xs font-semibold tabular-nums">
        Bobot {score}
      </span>
    );
  }
  if (correct) {
    return (
      <span className="flex shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-answered">
        <Check className="size-4" aria-hidden /> Kunci
      </span>
    );
  }
  if (wrong) {
    return (
      <span className="flex shrink-0 items-center gap-1 pt-1 text-xs font-semibold text-destructive">
        <X className="size-4" aria-hidden /> Salah
      </span>
    );
  }
  return null;
}
