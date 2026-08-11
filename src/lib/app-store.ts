"use client";

import { create } from "zustand";
import type { SectionId } from "@/lib/nav";
import type { NoteType, NoteColor, ContentBlock } from "@/lib/types";

// App navigation + editor state (single-page, in-memory)
interface AppState {
  section: SectionId;
  activeFolderId: string | null;
  activeTagId: string | null;
  // editor
  editorOpen: boolean;
  editorNoteId: string | null;
  editorNewType: NoteType | null;
  editorNewColor?: NoteColor;
  editorNewFolderId?: string | null;
  editorNewPrivate?: boolean;
  // create menu
  createMenuOpen: boolean;
  // info sheet
  infoNoteId: string | null;
  // move dialog
  moveNoteIds: string[] | null;
  // set section
  setSection: (s: SectionId) => void;
  openFolder: (id: string | null) => void;
  openTag: (id: string | null) => void;
  openEditor: (noteId: string | null, opts?: { newType?: NoteType; color?: NoteColor; folderId?: string | null; isPrivate?: boolean; content?: ContentBlock[] }) => void;
  closeEditor: () => void;
  setCreateMenu: (open: boolean) => void;
  setInfoNote: (id: string | null) => void;
  openMove: (ids: string[]) => void;
  closeMove: () => void;
}

export const useApp = create<AppState>((set) => ({
  section: "all",
  activeFolderId: null,
  activeTagId: null,
  editorOpen: false,
  editorNoteId: null,
  editorNewType: null,
  createMenuOpen: false,
  infoNoteId: null,
  moveNoteIds: null,
  setSection: (s) => set({ section: s, activeFolderId: null, activeTagId: null }),
  openFolder: (id) => set({ section: "notebooks", activeFolderId: id }),
  openTag: (id) => set({ section: "tags", activeTagId: id }),
  openEditor: (noteId, opts) =>
    set({
      editorOpen: true,
      editorNoteId: noteId,
      editorNewType: opts?.newType ?? null,
      editorNewColor: opts?.color,
      editorNewFolderId: opts?.folderId,
      editorNewPrivate: opts?.isPrivate,
    }),
  closeEditor: () =>
    set({ editorOpen: false, editorNoteId: null, editorNewType: null, editorNewColor: undefined, editorNewFolderId: undefined, editorNewPrivate: undefined }),
  setCreateMenu: (open) => set({ createMenuOpen: open }),
  setInfoNote: (id) => set({ infoNoteId: id }),
  openMove: (ids) => set({ moveNoteIds: ids }),
  closeMove: () => set({ moveNoteIds: null }),
}));
