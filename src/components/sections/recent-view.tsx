"use client";

import { useNotes } from "@/hooks/use-data";
import { NotesView } from "@/components/notes-view";

export function RecentView({ search }: { search: string }) {
  const { data, isLoading } = useNotes("all", search ? { q: search } : undefined);
  // recent = sorted by updatedAt desc, limited to 30
  const recent = (data || [])
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30);
  return (
    <NotesView
      notes={recent}
      loading={isLoading}
      query={search}
      emptyTitle="No recent notes"
      emptyHint="Notes you've recently edited will appear here."
    />
  );
}
