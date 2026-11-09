"use client";

import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dueWarnings, formatCountdown, remainingMs } from "@/lib/timer";
import { cn } from "@/lib/utils";

interface ExamCountdownProps {
  deadlineAt: number;
  warningsShown: number[];
  onWarning: (minutes: number | null, markShown: number[]) => void;
  onExpire: () => void;
}

/**
 * Komponen terpisah agar hanya angka ini yang dirender ulang tiap detik.
 * setInterval hanya pemicu; nilai yang tampil selalu dihitung dari deadline dan jam,
 * jadi throttling tab latar belakang atau refresh tidak menggeser waktu.
 */
export function ExamCountdown({ deadlineAt, warningsShown, onWarning, onExpire }: ExamCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef({ warningsShown, onWarning, onExpire });
  const expired = useRef(false);

  useEffect(() => {
    latest.current = { warningsShown, onWarning, onExpire };
  });

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const remaining = remainingMs(deadlineAt, current);
      if (remaining <= 0) {
        if (!expired.current) {
          expired.current = true;
          latest.current.onExpire();
        }
        return;
      }
      const { show, markShown } = dueWarnings(remaining, latest.current.warningsShown);
      if (markShown.length) latest.current.onWarning(show, markShown);
    };

    const interval = window.setInterval(tick, 1000);
    const first = window.setTimeout(tick, 0);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(first);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [deadlineAt]);

  const remaining = remainingMs(deadlineAt, now);
  const minutes = remaining / 60000;

  return (
    <div
      role="timer"
      aria-label={`Sisa waktu ${formatCountdown(remaining)}`}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-base font-semibold tabular-nums sm:text-lg",
        minutes <= 5
          ? "border-destructive bg-wrong-soft text-destructive"
          : minutes <= 15
            ? "border-flagged bg-flagged-soft"
            : "bg-card",
      )}
    >
      <Timer className="size-4 shrink-0" aria-hidden />
      {formatCountdown(remaining)}
    </div>
  );
}
