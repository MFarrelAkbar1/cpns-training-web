"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/stores/progress-store";

export function BookmarkButton({ questionId }: { questionId: string }) {
  const active = useProgressStore((s) => s.bookmarks.includes(questionId));
  const toggle = useProgressStore((s) => s.toggleBookmark);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={active}
      onClick={() => toggle(questionId)}
      title={active ? "Hapus dari bookmark" : "Simpan ke bookmark"}
    >
      <Bookmark className={cn(active && "fill-primary text-primary")} aria-hidden />
      <span className="hidden sm:inline">{active ? "Tersimpan" : "Bookmark"}</span>
      <span className="sr-only sm:hidden">{active ? "Tersimpan" : "Bookmark"}</span>
    </Button>
  );
}
