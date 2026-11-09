"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Answers, Category, Question } from "@/types";

interface NavigatorProps {
  /** Soal yang dapat dinavigasi, dalam urutan pengerjaan. */
  items: { question: Question; position: number }[];
  currentNumber: number | undefined;
  answers: Answers;
  flagged: number[];
  /** Kelompokkan per kategori; dimatikan saat urutan diacak. */
  grouped: boolean;
  onSelect: (position: number) => void;
}

/** Dipisah dengan memo: hitung mundur per detik tidak boleh merender ulang 110 tombol. */
export const QuestionNavigator = memo(function QuestionNavigator({
  items,
  currentNumber,
  answers,
  flagged,
  grouped,
  onSelect,
}: NavigatorProps) {
  const groups: { label: Category | null; items: NavigatorProps["items"] }[] = [];
  for (const item of items) {
    const label = grouped ? item.question.category : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <nav aria-label="Navigasi nomor soal" className="space-y-4">
      {groups.map((group, i) => (
        <div key={i}>
          {group.label && <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.label}</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
            {group.items.map(({ question, position }) => {
              const isFlagged = flagged.includes(question.number);
              const isAnswered = answers[question.number] !== undefined;
              const isCurrent = currentNumber === question.number;
              const status = isFlagged ? "ragu-ragu" : isAnswered ? "sudah dijawab" : "belum dijawab";
              return (
                <button
                  key={question.number}
                  type="button"
                  onClick={() => onSelect(position)}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Soal ${position + 1}, ${status}`}
                  title={`Soal ${position + 1}: ${status}`}
                  className={cn(
                    "aspect-square min-h-8 rounded-md font-mono text-xs font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                    isFlagged
                      ? "bg-flagged text-flagged-foreground"
                      : isAnswered
                        ? "bg-answered text-answered-foreground"
                        : "bg-unanswered text-unanswered-foreground hover:bg-accent",
                    isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                  )}
                >
                  {position + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
        <LegendItem className="bg-answered" label="Dijawab" />
        <LegendItem className="bg-unanswered" label="Belum" />
        <LegendItem className="bg-flagged" label="Ragu-ragu" />
      </ul>
    </nav>
  );
});

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} aria-hidden />
      {label}
    </li>
  );
}
