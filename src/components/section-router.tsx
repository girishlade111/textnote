"use client";

import { useApp } from "@/lib/app-store";
import { useUIStore, usePrivateSafeStore } from "@/lib/stores";
import { useNotes } from "@/hooks/use-data";
import { NotesView } from "@/components/notes-view";
import { NotebooksView } from "@/components/sections/notebooks-view";
import { TagsView } from "@/components/sections/tags-view";
import { TrashView } from "@/components/sections/trash-view";
import { PrivateSafeView } from "@/components/sections/private-safe-view";
import { SettingsView } from "@/components/sections/settings-view";
import { SharedView } from "@/components/sections/shared-view";
import { RecentView } from "@/components/sections/recent-view";
import { PinnedView } from "@/components/sections/pinned-view";

export function SectionRouter() {
  const { section, activeFolderId, activeTagId } = useApp();
  const search = useUIStore((s) => s.search);
  const privateUnlocked = usePrivateSafeStore((s) => s.unlocked);

  // Always call the notes hook at top level to satisfy rules-of-hooks.
  // We pass the scope that matches the current section.
  const scopeForAll = section === "all" || section === "recent" || section === "shared" ? "all" : section === "trash" ? "trash" : section === "private" ? "private" : section === "pinned" ? "pinned" : "all";
  const { data, isLoading } = useNotes(scopeForAll, search ? { q: search } : undefined);

  switch (section) {
    case "all":
      return (
        <NotesView
          notes={data || []}
          loading={isLoading}
          query={search}
          emptyTitle={search ? "No matching notes" : "No notes yet"}
          emptyHint={search ? `No notes match “${search}”.` : "Tap + to capture your first idea."}
        />
      );
    case "pinned":
      return <PinnedView search={search} />;
    case "recent":
      return <RecentView search={search} />;
    case "shared":
      return <SharedView search={search} />;
    case "notebooks":
      return <NotebooksView activeFolderId={activeFolderId} search={search} />;
    case "tags":
      return <TagsView activeTagId={activeTagId} search={search} />;
    case "trash":
      return <TrashView search={search} />;
    case "private":
      return <PrivateSafeView unlocked={privateUnlocked} search={search} />;
    case "settings":
      return <SettingsView />;
    default:
      return null;
  }
}
