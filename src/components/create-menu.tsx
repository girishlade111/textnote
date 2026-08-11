"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckSquare, Camera, Mic, Pencil, ScanLine, Paperclip, Sparkles,
  Download, ShieldCheck, X,
} from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useSettingsStore } from "@/lib/stores";
import { useCreateNote } from "@/hooks/use-data";
import { pickRandomColor } from "@/lib/notes";
import { colorHex, type NoteColor, type NoteType } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";

interface CreateItem {
  type: NoteType;
  label: string;
  desc: string;
  icon: any;
  accent: string;
}

const ITEMS: CreateItem[] = [
  { type: "text", label: "Text Note", desc: "Blank rich text note", icon: FileText, accent: "var(--primary)" },
  { type: "checklist", label: "Checklist", desc: "Track tasks and to-dos", icon: CheckSquare, accent: "#22c55e" },
  { type: "photo", label: "Photo Note", desc: "Capture or attach images", icon: Camera, accent: "#f59e0b" },
  { type: "audio", label: "Audio Recording", desc: "Record a voice note", icon: Mic, accent: "#ec4899" },
  { type: "sketch", label: "Sketch / Drawing", desc: "Draw freehand on canvas", icon: Pencil, accent: "#8b5cf6" },
  { type: "scan", label: "Scan Document", desc: "Scan and crop a document", icon: ScanLine, accent: "#06b6d4" },
  { type: "file", label: "Attach File", desc: "Attach any local file", icon: Paperclip, accent: "#f97316" },
  { type: "smart", label: "Smart Card", desc: "Auto preview a link", icon: Sparkles, accent: "#14b8a6" },
  { type: "bookmark", label: "Bookmark Card", desc: "Save a link card", icon: Sparkles, accent: "#a855f7" },
  { type: "code", label: "Code Note", desc: "Snippet with syntax", icon: FileText, accent: "#64748b" },
];

export function CreateMenu() {
  const { createMenuOpen, setCreateMenu, openEditor } = useApp();
  const settings = useSettingsStore((s) => s.settings);
  const createNote = useCreateNote();

  const handleCreate = (item: CreateItem) => {
    haptic();
    let color: NoteColor = settings.defaultNoteColor;
    if (settings.defaultNoteColorMode === "random") color = pickRandomColor();
    else if (settings.defaultNoteColorMode === "theme") color = "default";

    if (item.type === "text" || item.type === "checklist" || item.type === "code") {
      // open editor directly with type
      openEditor(null, { newType: item.type, color });
    } else {
      // create note then open editor
      createNote.mutate(
        { type: item.type, color, colorMode: settings.defaultNoteColorMode },
        {
          onSuccess: (note) => {
            toast.success("Note created");
            openEditor(note.id, { newType: item.type });
          },
        }
      );
    }
    setCreateMenu(false);
  };

  const handleImport = () => {
    setCreateMenu(false);
    useApp.getState().setSection("settings");
    toast.info("Open Import & Migration from Settings");
  };
  const handlePrivate = () => {
    setCreateMenu(false);
    openEditor(null, { newType: "text", isPrivate: true });
    toast.info("Create in PrivateSafe — unlock required");
  };

  return (
    <Sheet open={createMenuOpen} onOpenChange={setCreateMenu}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0">
        <SheetHeader className="px-5 pt-4 pb-2">
          <SheetTitle className="text-left flex items-center justify-between">
            <span>Create a note</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left font-normal">
            Choose a note type. You can change folder, tags, color, and privacy after creating.
          </p>
        </SheetHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 pb-8 max-h-[70vh] overflow-y-auto">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => handleCreate(item)}
                className="flex flex-col items-start gap-2 p-3 rounded-2xl border border-border/60 bg-card ls-ripple hover:elev-1 hover:border-primary/40 transition-all text-left"
              >
                <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${item.accent}1a`, color: item.accent }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium text-sm">{item.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{item.desc}</span>
              </motion.button>
            );
          })}

          <button
            onClick={handleImport}
            className="flex flex-col items-start gap-2 p-3 rounded-2xl border border-dashed border-border bg-transparent ls-ripple hover:bg-accent/40 transition-all text-left"
          >
            <span className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent text-accent-foreground">
              <Download className="h-5 w-5" />
            </span>
            <span className="font-medium text-sm">Import Content</span>
            <span className="text-[11px] text-muted-foreground leading-tight">From Markdown, JSON, HTML, TXT</span>
          </button>

          <button
            onClick={handlePrivate}
            className="flex flex-col items-start gap-2 p-3 rounded-2xl border border-primary/30 bg-primary/5 ls-ripple hover:bg-primary/10 transition-all text-left"
          >
            <span className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-medium text-sm">Create in PrivateSafe</span>
            <span className="text-[11px] text-muted-foreground leading-tight">Encrypted, biometric-locked</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
