"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, StickyNote, SearchX } from "lucide-react";
import { NoteCard } from "@/components/note-card";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { useApp } from "@/lib/app-store";
import { useUIStore, usePrivateSafeStore } from "@/lib/stores";
import { useUpdateNote, useDeleteNote, useDuplicateNote } from "@/hooks/use-data";
import { useTheme } from "next-themes";
import type { NoteDto, NoteColor } from "@/lib/types";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";

interface NotesViewProps {
  notes: NoteDto[];
  loading?: boolean;
  query?: string;
  emptyTitle?: string;
  emptyHint?: string;
  isTrashView?: boolean;
  onCardAction?: (action: string, note: NoteDto) => void;
}

export function NotesView({ notes, loading, query, emptyTitle, emptyHint, isTrashView }: NotesViewProps) {
  const { view, sort } = useUIStore();
  const { openEditor, setInfoNote, openMove, setCreateMenu } = useApp();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const privateUnlocked = usePrivateSafeStore((s) => s.unlocked);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const duplicateNote = useDuplicateNote();

  const sorted = useMemo(() => {
    const arr = [...notes];
    arr.sort((a, b) => {
      // pinned first (except trash)
      if (sort !== "pinned" && !a.isDeleted && !b.isDeleted) {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      }
      switch (sort) {
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "title":
          return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        case "color": {
          const order = ["default","red","orange","amber","yellow","lime","green","teal","cyan","blue","violet","purple","pink","rose","brown","grey"];
          return order.indexOf(a.color) - order.indexOf(b.color);
        }
        case "folder":
          return (a.folderName || "zzz").localeCompare(b.folderName || "zzz");
        case "pinned":
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return arr;
  }, [notes, sort]);

  if (loading) {
    return (
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-2"}>
        {Array.from({ length: view === "grid" ? 8 : 6 }).map((_, i) => (
          <div key={i} className="ls-skeleton rounded-2xl h-44" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || (query ? "No matching notes" : "No notes yet")}
        hint={emptyHint || (query ? `No notes match “${query}”. Try a different search.` : "Tap + to capture your first idea.")}
        showAction={!query}
        onCreate={() => { haptic(); setCreateMenu(true); }}
      />
    );
  }

  const handleColor = (note: NoteDto, c: NoteColor) => {
    updateNote.mutate({ id: note.id, color: c });
    toast.success("Note color changed");
  };

  return (
    <>
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-2"}>
        <AnimatePresence mode="popLayout">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              view={view}
              query={query}
              isDark={isDark}
              privateUnlocked={privateUnlocked}
              onOpen={() => openEditor(note.id)}
              onTogglePin={() => {
                updateNote.mutate({ id: note.id, isPinned: !note.isPinned });
                toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
              }}
              onSetColor={(c) => handleColor(note, c)}
              onMove={() => openMove([note.id])}
              onDuplicate={() => { duplicateNote.mutate(note.id); toast.success("Note duplicated"); }}
              onDelete={() => { deleteNote.mutate(note.id); toast.success("Note moved to Trash"); }}
              onInfo={() => setInfoNote(note.id)}
              onExport={() => useApp.getState().setSection("shared")}
              onShare={() => toast.info("Opening share…")}
              onTags={() => openEditor(note.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      <BulkActionBar notes={sorted} isTrashView={isTrashView} />
    </>
  );
}

export function EmptyState({ title, hint, showAction, onCreate }: { title: string; hint: string; showAction?: boolean; onCreate?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
    >
      <div className="h-20 w-20 rounded-3xl bg-accent/60 flex items-center justify-center mb-5">
        {showAction ? <StickyNote className="h-9 w-9 text-primary" /> : <SearchX className="h-9 w-9 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{hint}</p>
      {showAction && onCreate && (
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-primary-foreground font-medium elev-1 ls-ripple hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> Create note
        </button>
      )}
    </motion.div>
  );
}
