"use client";

import { useNotes } from "@/hooks/use-data";
import { NotesView } from "@/components/notes-view";
import { Pin } from "lucide-react";

export function PinnedView({ search }: { search: string }) {
  const { data, isLoading } = useNotes("pinned", search ? { q: search } : undefined);
  return (
    <NotesView
      notes={data || []}
      loading={isLoading}
      query={search}
      emptyTitle="No pinned notes"
      emptyHint="Pin important notes to keep them at the top. Long-press a note or use its menu to pin."
    />
  );
}
