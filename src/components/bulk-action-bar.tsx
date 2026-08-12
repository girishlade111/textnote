"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin, PinOff, FolderInput, Tag as TagIcon, Download, Trash2, X, CheckSquare, Square,
} from "lucide-react";
import { useSelectionStore } from "@/lib/stores";
import { useBulkNotesAction, useFolders, useTags } from "@/hooks/use-data";
import type { NoteDto, NoteColor } from "@/lib/types";
import { colorHex } from "@/lib/types";
import { exportNotesAsJson } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { haptic, downloadFile } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  notes: NoteDto[];
  isTrashView?: boolean;
}

export function BulkActionBar({ notes, isTrashView }: BulkActionBarProps) {
  const { selected, selecting, clear, toggle } = useSelectionStore();
  const bulkAction = useBulkNotesAction();
  const { data: folders } = useFolders();
  const { data: tags } = useTags();

  const [moveOpen, setMoveOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  if (!selecting) return null;

  const selectedCount = selected.size;
  const selectedNoteIds = Array.from(selected);
  const allSelected = notes.length > 0 && selectedCount === notes.length;

  const handleSelectAll = () => {
    haptic();
    if (allSelected) {
      clear();
      useSelectionStore.getState().start();
    } else {
      notes.forEach((n) => {
        if (!selected.has(n.id)) toggle(n.id);
      });
    }
  };

  const handlePin = (pin: boolean) => {
    haptic();
    bulkAction.mutate(
      { action: pin ? "pin" : "unpin", noteIds: selectedNoteIds },
      {
        onSuccess: () => {
          toast.success(`${selectedCount} note${selectedCount > 1 ? "s" : ""} ${pin ? "pinned" : "unpinned"}`);
          clear();
        },
      }
    );
  };

  const handleMoveConfirm = () => {
    haptic();
    bulkAction.mutate(
      { action: "move", noteIds: selectedNoteIds, folderId: selectedFolderId },
      {
        onSuccess: () => {
          toast.success(`Moved ${selectedCount} note${selectedCount > 1 ? "s" : ""}`);
          setMoveOpen(false);
          clear();
        },
      }
    );
  };

  const handleTagConfirm = () => {
    haptic();
    bulkAction.mutate(
      { action: "tag", noteIds: selectedNoteIds, tagNames: selectedTagNames },
      {
        onSuccess: () => {
          toast.success(`Updated tags on ${selectedCount} note${selectedCount > 1 ? "s" : ""}`);
          setTagOpen(false);
          clear();
        },
      }
    );
  };

  const handleExport = () => {
    haptic();
    const selectedNotes = notes.filter((n) => selected.has(n.id));
    if (selectedNotes.length === 0) return;
    const jsonStr = exportNotesAsJson(selectedNotes);
    downloadFile(`ls-notes-batch-export-${Date.now()}.json`, jsonStr, "application/json");
    toast.success(`Exported ${selectedNotes.length} note${selectedNotes.length > 1 ? "s" : ""}`);
  };

  const handleDelete = () => {
    haptic();
    const action = isTrashView ? "delete" : "trash";
    bulkAction.mutate(
      { action, noteIds: selectedNoteIds },
      {
        onSuccess: () => {
          toast.success(
            isTrashView
              ? `Permanently deleted ${selectedCount} note${selectedCount > 1 ? "s" : ""}`
              : `Moved ${selectedCount} note${selectedCount > 1 ? "s" : ""} to Trash`
          );
          clear();
        },
      }
    );
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92vw] sm:w-auto"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 rounded-full bg-foreground text-background shadow-2xl border border-border/20 backdrop-blur-md">
            {/* Selected Count & Toggle All */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-background hover:bg-background/20 rounded-full h-8 px-2.5 text-xs font-medium"
            >
              {allSelected ? <CheckSquare className="h-4 w-4 mr-1 text-primary-foreground" /> : <Square className="h-4 w-4 mr-1" />}
              {selectedCount} selected
            </Button>

            <div className="h-4 w-px bg-background/20 mx-0.5" />

            {/* Batch Actions */}
            {selectedCount > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePin(true)}
                  className="text-background hover:bg-background/20 rounded-full h-8 w-8"
                  title="Pin selected"
                >
                  <Pin className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMoveOpen(true)}
                  className="text-background hover:bg-background/20 rounded-full h-8 w-8"
                  title="Move to folder"
                >
                  <FolderInput className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTagOpen(true)}
                  className="text-background hover:bg-background/20 rounded-full h-8 w-8"
                  title="Add / change tags"
                >
                  <TagIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExport}
                  className="text-background hover:bg-background/20 rounded-full h-8 w-8"
                  title="Export selected"
                >
                  <Download className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-destructive-foreground hover:bg-destructive/30 rounded-full h-8 w-8"
                  title={isTrashView ? "Permanently delete" : "Move to Trash"}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </>
            )}

            <div className="h-4 w-px bg-background/20 mx-0.5" />

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={clear}
              className="text-background hover:bg-background/20 rounded-full h-8 w-8"
              title="Close selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Batch Move Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Move {selectedCount} notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-60 overflow-y-auto">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-sm transition-colors",
                selectedFolderId === null && "bg-accent font-medium"
              )}
            >
              <span>No notebook (All Notes)</span>
            </button>
            {folders?.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-sm transition-colors",
                  selectedFolderId === f.id && "bg-accent font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: f.color !== "default" ? colorHex(f.color as NoteColor) : "var(--muted-foreground)" }}
                  />
                  <span>{f.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{f.noteCount}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleMoveConfirm} disabled={bulkAction.isPending}>
              Move Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Tag Dialog */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tag {selectedCount} notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {tags?.map((t) => {
              const active = selectedTagNames.includes(t.name);
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTagNames((prev) =>
                      active ? prev.filter((x) => x !== t.name) : [...prev, t.name]
                    );
                  }}
                  className="flex items-center justify-between p-2 rounded-xl border cursor-pointer hover:bg-accent"
                >
                  <span className="text-sm font-medium">#{t.name}</span>
                  <Checkbox checked={active} />
                </div>
              );
            })}
            {(!tags || tags.length === 0) && (
              <p className="text-sm text-muted-foreground">No tags available yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTagOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleTagConfirm} disabled={bulkAction.isPending}>
              Apply Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
