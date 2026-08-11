"use client";

import { useNote } from "@/hooks/use-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/lib/app-store";
import { formatDateTime, formatFileSize, checklistProgress, hasAttachment } from "@/lib/notes";
import { colorHex, NOTE_COLORS } from "@/lib/types";
import { Calendar, Folder as FolderIcon, Tag as TagIcon, Type, Paperclip, CheckSquare, Lock, HardDrive, Palette, FileText } from "lucide-react";

export function NoteInfoSheet() {
  const { infoNoteId, setInfoNote } = useApp();
  const { data: note } = useNote(infoNoteId);
  const open = !!infoNoteId;
  const progress = note ? checklistProgress(note.content) : { done: 0, total: 0 };
  const atts = note ? hasAttachment(note.content) : { images: 0, audio: 0, files: 0, drawings: 0 };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && setInfoNote(null)}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Note information</SheetTitle>
        </SheetHeader>
        {note && (
          <div className="px-4 pb-6 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: note.color !== "default" ? `${colorHex(note.color)}1a` : "var(--accent)" }}>
                <FileText className="h-5 w-5" style={{ color: note.color !== "default" ? colorHex(note.color) : "var(--primary)" }} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold truncate">{note.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground capitalize">{note.type} note</div>
              </div>
            </div>

            <InfoRow icon={Calendar} label="Created" value={formatDateTime(note.createdAt)} />
            <InfoRow icon={Calendar} label="Last modified" value={formatDateTime(note.updatedAt)} />
            <InfoRow icon={FolderIcon} label="Notebook" value={note.folderName || "All Notes"} />
            <InfoRow icon={TagIcon} label="Tags" value={note.tags.length ? note.tags.map((t) => `#${t.name}`).join("  ") : "—"} />
            <InfoRow icon={Type} label="Type" value={<span className="capitalize">{note.type}</span>} />
            <InfoRow icon={Palette} label="Color" value={
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border" style={{ background: note.color === "default" ? "var(--card)" : colorHex(note.color) }} />
                {NOTE_COLORS.find((c) => c.id === note.color)?.label || note.color}
              </span>
            } />
            <InfoRow icon={Paperclip} label="Attachments" value={`${note.attachmentCount + atts.images + atts.audio + atts.files + atts.drawings} items · ${formatFileSize(note.attachmentsSize)}`} />
            <InfoRow icon={Type} label="Words / Characters" value={`${note.wordCount} / ${note.charCount}`} />
            {progress.total > 0 && <InfoRow icon={CheckSquare} label="Checklist" value={`${progress.done} of ${progress.total} completed`} />}
            <InfoRow icon={Lock} label="Privacy" value={note.isPrivate ? "PrivateSafe protected" : "Standard"} />
            <InfoRow icon={HardDrive} label="Storage" value={note.isPrivate ? "App-private encrypted storage" : "Standard local storage"} />

            <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">
              LS Notes stores this note locally on your device. No cloud, no sync, no tracking.
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
