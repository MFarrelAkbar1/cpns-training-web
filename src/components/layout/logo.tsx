import Link from "next/link";

/** Tanda LJK: lima bulatan jawaban, satu terisi. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      {[7, 12.5, 18, 23.5].map((x, column) =>
        [10, 16, 22].map((y, row) => (
          <circle
            key={`${column}-${row}`}
            cx={x + 0.75}
            cy={y}
            r="2"
            fill={(column === 2 && row === 0) || (column === 0 && row === 1) || (column === 3 && row === 2) ? "var(--primary-foreground)" : "none"}
            stroke="var(--primary-foreground)"
            strokeOpacity={(column === 2 && row === 0) || (column === 0 && row === 1) || (column === 3 && row === 2) ? 1 : 0.55}
            strokeWidth="1"
          />
        )),
      )}
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <LogoMark className="size-8" />
      <span className={compact ? "hidden sm:inline" : undefined}>
        CAT CPNS <span className="font-mono text-sm font-medium text-muted-foreground">2027</span>
      </span>
    </Link>
  );
}
