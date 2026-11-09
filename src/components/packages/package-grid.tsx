"use client";

import { CheckCircle2, CircleDashed, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterTabs } from "@/components/layout/filter-tabs";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { attemptKey } from "@/lib/attempt";
import { PACKAGES, type PackageMeta } from "@/lib/question-loader";
import { latestCompleted, packageStatus } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";
import type { AttemptMode, PackageStatus } from "@/types";

type Filter = "all" | PackageStatus;

const STATUS: Record<PackageStatus, { label: string; icon: typeof CircleDashed; className: string }> = {
  not_started: { label: "Belum dikerjakan", icon: CircleDashed, className: "text-muted-foreground" },
  in_progress: { label: "Sedang dikerjakan", icon: PlayCircle, className: "text-primary" },
  completed: { label: "Sudah selesai", icon: CheckCircle2, className: "text-answered" },
};

/** Grid paket. `mode` membatasi tombol ke satu mode; tanpa mode tampil keduanya. */
export function PackageGrid({ mode }: { mode?: AttemptMode }) {
  const hydrated = useHydrated();
  const activeMap = useProgressStore((s) => s.active);
  const history = useProgressStore((s) => s.history);
  const [filter, setFilter] = useState<Filter>("all");

  const active = useMemo(() => Object.values(activeMap), [activeMap]);
  const statusOf = (id: string) => (hydrated ? packageStatus(id, active, history) : "not_started");
  const count = (status: PackageStatus) => PACKAGES.filter((p) => statusOf(p.id) === status).length;
  const visible = PACKAGES.filter((p) => filter === "all" || statusOf(p.id) === filter);

  return (
    <>
      <div className="mb-6">
        <FilterTabs
          label="Filter status paket"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Semua paket", count: PACKAGES.length },
            { value: "not_started", label: "Belum dikerjakan", count: count("not_started") },
            { value: "in_progress", label: "Sedang dikerjakan", count: count("in_progress") },
            { value: "completed", label: "Sudah selesai", count: count("completed") },
          ]}
        />
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Tidak ada paket dengan status ini.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((meta) => (
            <PackageCard key={meta.id} meta={meta} status={statusOf(meta.id)} mode={mode} hydrated={hydrated} />
          ))}
        </div>
      )}
    </>
  );
}

function PackageCard({
  meta,
  status,
  mode,
  hydrated,
}: {
  meta: PackageMeta;
  status: PackageStatus;
  mode?: AttemptMode;
  hydrated: boolean;
}) {
  const history = useProgressStore((s) => s.history);
  const activeMap = useProgressStore((s) => s.active);
  const last = hydrated ? latestCompleted(meta.id, history) : null;
  const info = STATUS[status];
  const Icon = info.icon;

  const label = (m: AttemptMode) => {
    const resume = hydrated && activeMap[attemptKey(m, meta.id)];
    if (m === "exam") return resume ? "Lanjutkan simulasi" : "Simulasi";
    return resume ? "Lanjutkan latihan" : "Latihan";
  };

  return (
    <article className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{meta.name}</h2>
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", info.className)}>
          <Icon className="size-3.5" aria-hidden />
          {info.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {(["TWK", "TIU", "TKP"] as const).map((c) => (
          <div key={c} className="rounded-lg bg-muted py-2">
            <dt className="text-xs text-muted-foreground">{c}</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">{meta.counts[c]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{meta.totalQuestions} soal</span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          {meta.durationMinutes} menit
        </span>
      </div>

      <p className="mt-3 border-t pt-3 text-sm">
        <span className="text-muted-foreground">Skor terakhir: </span>
        {last ? (
          <Link href={`/results/${last.id}`} className="font-mono font-semibold tabular-nums underline-offset-4 hover:underline">
            {last.result.total}/{last.result.max}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </p>

      <div className="mt-4 flex flex-1 items-end gap-2">
        {(!mode || mode === "practice") && (
          <Button variant={mode ? "default" : "outline"} className="flex-1" asChild>
            <Link href={`/practice/${meta.id}`}>{label("practice")}</Link>
          </Button>
        )}
        {(!mode || mode === "exam") && (
          <Button className="flex-1" asChild>
            <Link href={`/exam/${meta.id}`}>{label("exam")}</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
