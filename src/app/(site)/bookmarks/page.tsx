import type { Metadata } from "next";
import { BookmarksView } from "@/components/questions/bookmarks-view";

export const metadata: Metadata = { title: "Bookmark" };

export default function BookmarksPage() {
  return <BookmarksView />;
}
