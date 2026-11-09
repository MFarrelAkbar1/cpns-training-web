import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export const CATEGORY_INFO: Record<Category, { name: string; dot: string; fill: string }> = {
  TWK: { name: "Tes Wawasan Kebangsaan", dot: "bg-chart-twk", fill: "var(--chart-twk)" },
  TIU: { name: "Tes Intelegensi Umum", dot: "bg-chart-tiu", fill: "var(--chart-tiu)" },
  TKP: { name: "Tes Karakteristik Pribadi", dot: "bg-chart-tkp", fill: "var(--chart-tkp)" },
};

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground",
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", CATEGORY_INFO[category].dot)} aria-hidden />
      {category}
    </span>
  );
}
