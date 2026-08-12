"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, LayoutGrid, List, SlidersHorizontal, Plus, Menu, X, ShieldCheck,
  StickyNote, Folder, Tag, Pin, Clock, Share2, Trash2, Settings as SettingsIcon,
  ChevronDown, Sparkles, CheckSquare,
} from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useUIStore, useSettingsStore, usePrivateSafeStore, useSelectionStore } from "@/lib/stores";
import { useNotes, useFolders, useTags, useUpdateNote, useDeleteNote, useDuplicateNote, useStats } from "@/hooks/use-data";
import { PRIMARY_SECTIONS, SECONDARY_SECTIONS, type SectionId } from "@/lib/nav";
import { colorHex, type NoteColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NoteCard } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { haptic } from "@/lib/ui-helpers";

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { section, setSection, setCreateMenu } = useApp();
  const { view, setView, sort, setSort, search, setSearch } = useUIStore();
  const settings = useSettingsStore((s) => s.settings);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // use default view from settings if user hasn't toggled
  useEffect(() => {
    if (settings.defaultView) setView(settings.defaultView);
  }, [settings.defaultView]);

  const sectionLabel = useMemo(() => {
    return [...PRIMARY_SECTIONS, ...SECONDARY_SECTIONS].find((s) => s.id === section)?.label || "LS Notes";
  }, [section]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center gap-2 px-3 sm:px-5 h-14">
          {/* mobile drawer trigger */}
          <Button variant="ghost" size="icon" className="lg:hidden ls-ripple rounded-full" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>

          {/* logo (desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 pr-3">
            <Logo size={32} className="text-primary" />
            <div className="leading-tight">
              <div className="font-bold text-[15px] tracking-tight">LS Notes</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">Private · Local · Offline</div>
            </div>
          </div>

          {/* search */}
          <div className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, tags, folders…"
                className="pl-10 pr-9 h-10 rounded-full bg-muted/50 border-border/40 backdrop-blur-md focus-visible:bg-background focus-visible:border-primary/60 transition-all"
                aria-label="Search notes"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-foreground/10" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* view toggle */}
          <div className="hidden sm:flex items-center rounded-full bg-muted/50 p-1 border border-border/40 backdrop-blur-md">
            <button
              onClick={() => setView("grid")}
              className={cn("p-1.5 rounded-full transition-all", view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-full transition-all", view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Select notes toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (useSelectionStore.getState().selecting) {
                useSelectionStore.getState().clear();
              } else {
                useSelectionStore.getState().start();
              }
            }}
            className={cn("ls-ripple rounded-full", useSelectionStore.getState().selecting && "bg-primary text-primary-foreground")}
            aria-label="Select notes"
            title="Select multiple notes"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>

          {/* sort & filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ls-ripple rounded-full" aria-label="Sort & filter">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 glass-dialog rounded-2xl">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sort by</div>
              {([
                ["updated", "Last modified"],
                ["created", "Date created"],
                ["title", "Title"],
                ["color", "Color"],
                ["folder", "Folder"],
                ["pinned", "Pinned status"],
              ] as const).map(([v, label]) => (
                <DropdownMenuItem key={v} onClick={() => setSort(v)} className={cn("rounded-xl", sort === v && "bg-accent text-accent-foreground font-medium")}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col glass-sidebar p-3.5 gap-1.5 sticky top-14 h-[calc(100vh-3.5rem)]">
          <Button
            onClick={() => { haptic(); setCreateMenu(true); }}
            className="w-full justify-start gap-2.5 h-12 rounded-2xl glass-fab font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all mb-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Note</span>
          </Button>
          <SideNav section={section} onSelect={setSection} />
          <div className="mt-auto p-3.5 rounded-2xl glass-panel text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Private by design
            </div>
            Your notes are stored locally on this device. No accounts, no cloud, no tracking.
          </div>
        </aside>

        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 p-4 flex flex-col glass-panel border-r-border/60">
            <SheetHeader className="mb-2">
              <SheetTitle className="flex items-center gap-2">
                <Logo size={28} className="text-primary" /> LS Notes
              </SheetTitle>
            </SheetHeader>
            <Button
              onClick={() => { haptic(); setDrawerOpen(false); setCreateMenu(true); }}
              className="w-full justify-start gap-2.5 h-12 rounded-2xl glass-fab font-semibold mb-2"
            >
              <Plus className="h-5 w-5" />
              <span>New Note</span>
            </Button>
            <SideNav
              section={section}
              onSelect={(s) => { setSection(s); setDrawerOpen(false); }}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-4">
          <SectionHeader label={sectionLabel} />
          <div className="flex-1 px-3 sm:px-5 pb-4">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => { haptic(); setCreateMenu(true); }}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 h-14 w-14 rounded-2xl glass-fab flex items-center justify-center"
        aria-label="Create note (+)"
        title="Create note (+)"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-header pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {PRIMARY_SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { haptic(); setSection(s.id); }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full flex-1 text-[10px] font-medium ls-ripple rounded-xl transition-all",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
                aria-label={s.label}
                aria-current={active ? "page" : undefined}
              >
                <span className={cn("p-2 rounded-2xl transition-all", active && "ls-nav-active shadow-sm")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate max-w-[60px]">{s.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-5 py-3 sticky top-14 z-20 bg-background/80 backdrop-blur-sm">
      <h1 className="text-xl font-bold tracking-tight">{label}</h1>
    </div>
  );
}

function SideNav({ section, onSelect }: { section: SectionId; onSelect: (s: SectionId) => void }) {
  const { data: folders } = useFolders();
  const { data: tags } = useTags();
  const { activeFolderId, openFolder, openTag } = useApp();
  const stats = useStatsCounts();

  return (
    <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
      {PRIMARY_SECTIONS.map((s) => (
        <NavItem key={s.id} icon={s.icon} label={s.label} active={section === s.id} count={stats[s.id]} onClick={() => onSelect(s.id)} />
      ))}
      <div className="my-2 border-t border-border/60" />
      {SECONDARY_SECTIONS.map((s) => (
        <NavItem key={s.id} icon={s.icon} label={s.label} active={section === s.id} count={stats[s.id]} onClick={() => onSelect(s.id)} />
      ))}
      {folders && folders.length > 0 && (
        <>
          <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notebooks</div>
          {folders.slice(0, 6).map((f) => (
            <NavItem
              key={f.id}
              icon={Folder}
              label={f.name}
              dotColor={f.color !== "default" ? colorHex(f.color as NoteColor) : undefined}
              active={section === "notebooks" && activeFolderId === f.id}
              count={f.noteCount}
              onClick={() => { openFolder(f.id); }}
            />
          ))}
        </>
      )}
      {tags && tags.length > 0 && (
        <>
          <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</div>
          {tags.slice(0, 6).map((t) => (
            <NavItem
              key={t.id}
              icon={Tag}
              label={t.name}
              dotColor={t.color !== "default" ? colorHex(t.color as NoteColor) : undefined}
              active={section === "tags"}
              count={t.noteCount}
              onClick={() => { openTag(t.id); }}
            />
          ))}
        </>
      )}
    </nav>
  );
}

function useStatsCounts(): Record<string, number> {
  const { data } = useStats();
  return {
    all: data?.notes ?? 0,
    notebooks: 0,
    tags: 0,
    pinned: 0,
    recent: data?.notes ?? 0,
    shared: 0,
    trash: data?.trash ?? 0,
    private: data?.privateNotes ?? 0,
    settings: 0,
  };
}

function NavItem({
  icon: Icon, label, active, count, onClick, dotColor,
}: {
  icon: any; label: string; active?: boolean; count?: number; onClick: () => void; dotColor?: string;
}) {
  return (
    <button
      onClick={() => { haptic(); onClick(); }}
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium ls-ripple text-left transition-all",
        active ? "ls-nav-active font-semibold shadow-sm" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {dotColor ? (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dotColor }} />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate flex-1">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] tabular-nums text-muted-foreground/80">{count}</span>
      )}
    </button>
  );
}
