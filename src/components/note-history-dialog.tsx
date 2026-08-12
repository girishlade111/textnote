"use client";

import { useState } from "react";
import { Clock, RotateCcw, FileText, Eye, AlertCircle, Calendar, Hash, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNoteHistory, useRestoreHistoryNote } from "@/hooks/use-data";
import { blocksToExcerpt, blocksToPlainText, countWords, countChars, relativeTime, formatDateTime } from "@/lib/notes";
import type { ContentBlock } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NoteHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string | null;
  onRestored?: (title: string, content: ContentBlock[]) => void;
}

export function NoteHistoryDialog({ open, onOpenChange, noteId, onRestored }: NoteHistoryDialogProps) {
  const { data: history, isLoading } = useNoteHistory(open ? noteId : null);
  const restoreMutation = useRestoreHistoryNote();

  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [confirmSnapshot, setConfirmSnapshot] = useState<any | null>(null);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedSnapshot(null);
      setConfirmSnapshot(null);
    }
    onOpenChange(v);
  };

  const handleRestore = async (snap: any) => {
    if (!noteId) return;
    try {
      const data = await restoreMutation.mutateAsync({ noteId, historyId: snap.id });
      if (onRestored) {
        onRestored(data.title, data.content);
      }
      toast.success(`Restored version from ${relativeTime(snap.createdAt)}`);
      setConfirmSnapshot(null);
      setSelectedSnapshot(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore history snapshot");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-border/60 bg-background shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                Note Revision History
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Local snapshots stored on this device. Revert to any previous version at any time.
              </DialogDescription>
            </div>
            {selectedSnapshot && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-full"
                onClick={() => setSelectedSnapshot(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to list
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Clock className="h-8 w-8 animate-spin opacity-50" />
                <span className="text-sm">Loading local edit history…</span>
              </div>
            ) : !history || history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="font-medium text-sm">No Edit History Yet</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  LS Notes automatically captures local snapshots whenever you edit your note over time.
                </p>
              </div>
            ) : selectedSnapshot ? (
              // Snapshot detail & text preview view
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/50">
                  <div>
                    <div className="text-xs text-muted-foreground">Snapshot Created</div>
                    <div className="font-semibold text-sm">{formatDateTime(selectedSnapshot.createdAt)}</div>
                    <div className="text-[11px] text-muted-foreground">{relativeTime(selectedSnapshot.createdAt)}</div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full gap-1.5 px-4 shadow-sm"
                    onClick={() => setConfirmSnapshot(selectedSnapshot)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restore This Version
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</div>
                  <div className="p-3 rounded-xl bg-card border border-border/70 text-sm font-semibold">
                    {selectedSnapshot.title || "Untitled"}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>Content Preview</span>
                    <span>
                      {countWords(selectedSnapshot.content)} words · {countChars(selectedSnapshot.content)} chars
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/70 text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-foreground/90 font-mono">
                    {blocksToPlainText(selectedSnapshot.content) || <em className="text-muted-foreground">Empty note content</em>}
                  </div>
                </div>
              </div>
            ) : (
              // Snapshot list view
              <div className="space-y-2.5">
                {history.map((snap: any, index: number) => {
                  const excerpt = blocksToExcerpt(snap.content);
                  const wordCount = countWords(snap.content);
                  return (
                    <div
                      key={snap.id}
                      className={cn(
                        "group relative flex items-start justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {snap.title || "Untitled"}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                              Latest Saved
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                          {excerpt || "Empty note content"}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(snap.createdAt)} ({relativeTime(snap.createdAt)})
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {wordCount} words
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs rounded-full gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedSnapshot(snap)}
                          title="Preview full snapshot"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-full gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => setConfirmSnapshot(snap)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog before reverting */}
      <AlertDialog open={!!confirmSnapshot} onOpenChange={(o) => !o && setConfirmSnapshot(null)}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" /> Confirm Note Revert
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2 pt-1 text-muted-foreground">
              <span>
                Are you sure you want to revert this note to the version from{" "}
                <strong className="text-foreground font-medium">
                  {confirmSnapshot ? formatDateTime(confirmSnapshot.createdAt) : ""}
                </strong>
                ?
              </span>
              <span className="block p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                Your current note state will be automatically saved as a new local history checkpoint before reverting.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full gap-1.5"
              onClick={() => confirmSnapshot && handleRestore(confirmSnapshot)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring…" : "Yes, Restore Version"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
