"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import { useNotes, useRestoreNote, usePermanentDeleteNote, useEmptyTrash } from "@/hooks/use-data";
import { useApp } from "@/lib/app-store";
import { useSettingsStore } from "@/lib/stores";
import { colorBg, colorHex, type NoteColor } from "@/lib/types";
import { relativeTime, formatDateTime } from "@/lib/notes";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";

export function TrashView({ search }: { search: string }) {
  const { data, isLoading } = useNotes("trash");
  const settings = useSettingsStore((s) => s.settings);
  const restoreNote = useRestoreNote();
  const permanentDelete = usePermanentDeleteNote();
  const emptyTrash = useEmptyTrash();
  const { openEditor } = useApp();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [emptyOpen, setEmptyOpen] = useState(false);

  const notes = (data || []).filter((n) => !search || (n.title + n.excerpt).toLowerCase().includes(search.toLowerCase()));

  const daysLeft = (deletedAt: string | null) => {
    if (!deletedAt) return settings.trashRetentionDays;
    const ms = new Date(deletedAt).getTime();
    const elapsed = Date.now() - ms;
    const days = Math.ceil((settings.trashRetentionDays * 86400000 - elapsed) / 86400000);
    return Math.max(0, days);
  };

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="ls-skeleton rounded-2xl h-20" />)}</div>;
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
          <Trash2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Trash is empty</h3>
        <p className="text-sm text-muted-foreground max-w-xs">Deleted notes stay here for {settings.trashRetentionDays} days before being permanently removed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{notes.length}</span> item{notes.length !== 1 ? "s" : ""} in Trash · auto-purged after {settings.trashRetentionDays} days
        </div>
        <Button variant="destructive" size="sm" className="rounded-full" onClick={() => setEmptyOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Empty
        </Button>
      </div>

      <div className="space-y-2">
        {notes.map((n) => {
          const dl = daysLeft(n.deletedAt);
          const bg = colorBg(n.color, isDark);
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative rounded-2xl border border-border/60 p-3 flex items-center gap-3 overflow-hidden ls-ripple"
              style={{ background: bg }}
            >
              {n.color !== "default" && <span className="ls-color-stripe" style={{ background: colorHex(n.color as NoteColor) }} />}
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toast.info("Restore the note to view it")}>
                <h3 className="font-medium truncate">{n.title || "Untitled"}</h3>
                <p className="text-xs text-muted-foreground truncate">{n.excerpt || "No additional text"}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full", dl <= 3 ? "bg-destructive/15 text-destructive" : "bg-muted")}>
                    <AlertTriangle className="h-3 w-3" /> {dl === 0 ? "Deleting soon" : `${dl} day${dl !== 1 ? "s" : ""} left`}
                  </span>
                  {n.deletedAt && <span title={formatDateTime(n.deletedAt)}>deleted {relativeTime(n.deletedAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => restoreNote.mutate(n.id, { onSuccess: () => toast.success("Note restored", { description: n.folderId ? "Back to its folder" : "Restored to All Notes" }) })}
                  className="h-9 w-9 rounded-full hover:bg-foreground/5 flex items-center justify-center text-primary"
                  aria-label="Restore note"
                  title="Restore"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => permanentDelete.mutate(n.id, { onSuccess: () => toast.success("Note permanently deleted") })}
                  className="h-9 w-9 rounded-full hover:bg-foreground/5 flex items-center justify-center text-destructive"
                  aria-label="Delete permanently"
                  title="Delete permanently"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empty Trash?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {notes.length} item{notes.length !== 1 ? "s" : ""} in Trash. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmptyOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { emptyTrash.mutate(undefined, { onSuccess: () => { toast.success("Trash emptied"); setEmptyOpen(false); } }); }}>
              Empty Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
