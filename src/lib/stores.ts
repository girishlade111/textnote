"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppSettings, ThemeMode, NoteColor } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  set: (partial: Partial<AppSettings>) => void;
  hydrate: (s: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  set: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
  hydrate: (s) => set({ settings: s, loaded: true }),
}));

// UI-only ephemeral store (view, selection, search, drawer)
interface UIState {
  view: "grid" | "list";
  sort: "updated" | "created" | "title" | "color" | "folder" | "pinned";
  search: string;
  setView: (v: "grid" | "list") => void;
  setSort: (s: UIState["sort"]) => void;
  setSearch: (s: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: "grid",
      sort: "updated",
      search: "",
      setView: (v) => set({ view: v }),
      setSort: (s) => set({ sort: s }),
      setSearch: (s) => set({ search: s }),
    }),
    {
      name: "ls-notes-ui",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// PrivateSafe session (in-memory, never persisted)
interface PrivateSafeState {
  unlocked: boolean;
  unlockedAt: number | null;
  unlock: () => void;
  lock: () => void;
}

export const usePrivateSafeStore = create<PrivateSafeState>((set) => ({
  unlocked: false,
  unlockedAt: null,
  unlock: () => set({ unlocked: true, unlockedAt: Date.now() }),
  lock: () => set({ unlocked: false, unlockedAt: null }),
}));

// Currently selected note ids (bulk actions)
interface SelectionState {
  selected: Set<string>;
  selecting: boolean;
  toggle: (id: string) => void;
  clear: () => void;
  start: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: new Set<string>(),
  selecting: false,
  toggle: (id) => {
    const next = new Set(get().selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selected: next });
  },
  clear: () => set({ selected: new Set<string>(), selecting: false }),
  start: () => set({ selecting: true }),
}));
