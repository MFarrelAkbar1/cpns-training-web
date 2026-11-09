"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingState } from "@/components/layout/state-views";
import { ExamSession } from "@/components/exam/exam-session";
import { PracticeSession } from "@/components/practice/practice-session";
import { SessionStart } from "@/components/session/session-start";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePackage } from "@/hooks/use-package";
import { attemptKey } from "@/lib/attempt";
import { useProgressStore } from "@/stores/progress-store";
import type { AttemptMode, CompletedAttempt } from "@/types";

/** Menentukan isi halaman sesi: layar mulai atau pengerjaan yang sedang berjalan. */
export function SessionRoute({ packageId, mode }: { packageId: string; mode: AttemptMode }) {
  const hydrated = useHydrated();
  const { data: pkg, error, retry } = usePackage(packageId);
  const key = attemptKey(mode, packageId);
  const hasActive = useProgressStore((s) => s.active[key] !== undefined);
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-semibold">Data paket gagal dimuat.</p>
        <p className="text-sm text-muted-foreground">Periksa koneksi internet, lalu coba lagi. Jawaban Anda tetap tersimpan.</p>
        <Button onClick={retry}>Coba lagi</Button>
      </div>
    );
  }
  if (!hydrated || !pkg) return <LoadingState label="Memuat paket soal..." className="flex-1" />;
  if (finishing) return <LoadingState label="Menyiapkan hasil..." className="flex-1" />;
  if (!hasActive) return <SessionStart pkg={pkg} mode={mode} />;

  const onFinished = (completed: CompletedAttempt) => {
    setFinishing(true);
    router.replace(`/results/${completed.id}`);
  };

  return mode === "exam" ? (
    <ExamSession pkg={pkg} attemptKey={key} onFinished={onFinished} />
  ) : (
    <PracticeSession pkg={pkg} attemptKey={key} onFinished={onFinished} />
  );
}
