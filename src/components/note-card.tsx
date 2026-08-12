"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Pin, Lock, Paperclip, ImageIcon, Mic, FileText, Pencil, Code2, Link2,
  CheckSquare, Table as TableIcon, ScanLine, Sparkles, Bookmark, MoreVertical,
  Clock, Folder as FolderIcon,
} from "lucide-react";
import type { NoteDto, NoteColor } from "@/lib/types";
import { colorHex, colorBg } from "@/lib/types";
import { relativeTime, formatDateTime, checklistProgress, hasAttachment, highlightMatch } from "@/lib/notes";
import { useSettingsStore, useSelectionStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";

interface NoteCardProps {
  note: NoteDto;
  view: "grid" | "list";
  query?: string;
  isDark: boolean;
  privateUnlocked: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onSetColor: (c: NoteColor) => void;
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onExport: () => void;
  onShare: () => void;
  onTags: () => void;
}

const TYPE_ICON: Record<string, any> = {
  text: FileText, checklist: CheckSquare, photo: ImageIcon, audio: Mic,
  sketch: Pencil, file: Paperclip, smart: Sparkles, bookmark: Bookmark,
  code: Code2, table: TableIcon, scan: ScanLine,
};

function Highlighted({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const parts = highlightMatch(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.match ? <mark key={i} className="ls-hit">{p.text}</mark> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

export const NoteCard = memo(function NoteCard(props: NoteCardProps) {
  const { note, view, query, isDark, privateUnlocked, onOpen, onTogglePin, onSetColor, onMove, onDuplicate, onDelete, onInfo, onExport, onShare, onTags } = props;
  const settings = useSettingsStore((s) => s.settings);
  const { selected, selecting, toggle, start } = useSelectionStore();
  const isSelected = selected.has(note.id);

  const TypeIcon = TYPE_ICON[note.type] || FileText;
  const progress = checklistProgress(note.content);
  const atts = hasAttachment(note.content);
  const isPrivateLocked = note.isPrivate && !privateUnlocked;
  const bg = colorBg(note.color, isDark);
  const stripe = note.color !== "default" ? colorHex(note.color) : "transparent";

  const showCreated = settings.showTime === "created" || settings.showTime === "both";
  const showEdited = settings.showTime === "edited" || settings.showTime === "both";
  const showTime = settings.showTime !== "hidden";

  const title = note.title || "Untitled";
  const excerpt = isPrivateLocked ? "Private note — unlock to view" : note.excerpt || "No additional text";

  const handleClick = () => {
    if (selecting) {
      toggle(note.id);
    } else {
      onOpen();
    }
  };

  const content = (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={handleClick}
      className={cn(
        "ls-ripple group relative cursor-pointer rounded-3xl glass-card transition-all overflow-hidden",
        isSelected && "ring-2 ring-primary border-primary bg-primary/10 shadow-md",
        view === "list" ? "flex gap-3 p-3.5 pl-8 sm:pl-9" : "flex flex-col p-4 pt-7 sm:pt-6"
      )}
      style={{ background: isSelected ? undefined : bg }}
      role="button"
      tabIndex={0}
      aria-label={`Note: ${title}`}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      {/* color stripe */}
      {note.color !== "default" && (
        <span className="ls-color-stripe" style={{ background: stripe }} aria-hidden />
      )}

      {/* selection checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!selecting) start();
          toggle(note.id);
        }}
        className={cn(
          "absolute top-2 left-2 z-10 rounded-md p-1 transition-opacity",
          selecting || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-foreground/5"
        )}
        aria-label={isSelected ? "Deselect note" : "Select note"}
      >
        <div className={cn("h-4 w-4 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/60 bg-background/80")}>
          {isSelected && <CheckSquare className="h-3 w-3" />}
        </div>
      </button>

      {/* pinned / private badges */}
      <div className={cn("flex items-start justify-between gap-2", view === "list" && "flex-1 min-w-0")}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
          <h3 className={cn("font-semibold text-foreground/90 leading-snug", view === "list" ? "text-sm truncate" : "text-[15px] line-clamp-2")}>
            <Highlighted text={title} query={query} />
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {note.isPinned && <Pin className="h-3.5 w-3.5 text-primary fill-primary" aria-label="Pinned" />}
          {note.isPrivate && <Lock className="h-3.5 w-3.5 text-primary" aria-label="Private" />}
        </div>
      </div>

      {/* excerpt */}
      <p className={cn(
        "text-muted-foreground/80 leading-relaxed mt-1",
        view === "list" ? "text-xs line-clamp-1" : "text-xs line-clamp-3",
        isPrivateLocked && "italic"
      )}>
        <Highlighted text={excerpt} query={isPrivateLocked ? undefined : query} />
      </p>

      {/* checklist progress */}
      {progress.total > 0 && !isPrivateLocked && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {/* tags */}
      {note.tags.length > 0 && !isPrivateLocked && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((t) => (
            <Badge key={t.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full font-normal">
              #{t.name}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full font-normal">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* footer */}
      <div className={cn(
        "mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/80",
        view === "list" && "ml-auto"
      )}>
        {note.folderName && (
          <span className="inline-flex items-center gap-0.5 truncate max-w-[90px]">
            <FolderIcon className="h-3 w-3" /> {note.folderName}
          </span>
        )}
        {!isPrivateLocked && (atts.images > 0 || atts.audio > 0 || atts.files > 0 || atts.drawings > 0) && (
          <span className="inline-flex items-center gap-1">
            {atts.images > 0 && <span className="inline-flex items-center"><ImageIcon className="h-3 w-3" />{atts.images}</span>}
            {atts.audio > 0 && <span className="inline-flex items-center"><Mic className="h-3 w-3" />{atts.audio}</span>}
            {atts.files > 0 && <span className="inline-flex items-center"><Paperclip className="h-3 w-3" />{atts.files}</span>}
            {atts.drawings > 0 && <span className="inline-flex items-center"><Pencil className="h-3 w-3" />{atts.drawings}</span>}
          </span>
        )}
        {showTime && (
          <span className="inline-flex items-center gap-0.5 ml-auto" title={`${showCreated ? "Created " + formatDateTime(note.createdAt) : ""}${showCreated && showEdited ? " · " : ""}${showEdited ? "Edited " + formatDateTime(note.updatedAt) : ""}`}>
            <Clock className="h-3 w-3" />
            {relativeTime(showEdited ? note.updatedAt : note.createdAt)}
          </span>
        )}
      </div>

      {/* quick actions (visible on hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-foreground/5"
        aria-label={note.isPinned ? "Unpin note" : "Pin note"}
      >
        <Pin className={cn("h-3.5 w-3.5", note.isPinned && "text-primary fill-primary")} />
      </button>
    </motion.article>
  );

  const menuItems = (
    <>
      <ContextMenuItem onClick={onOpen}>Open</ContextMenuItem>
      <ContextMenuItem onClick={() => { if (!selecting) start(); toggle(note.id); }}>
        {isSelected ? "Deselect" : "Select"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onTogglePin}>{note.isPinned ? "Unpin" : "Pin"}</ContextMenuItem>
      <ContextMenuItem onClick={onTags}>Add / edit tags…</ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>Color</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-44">
          <div className="grid grid-cols-6 gap-1.5 p-2">
            {(["default","red","orange","amber","yellow","lime","green","teal","cyan","violet","purple","pink","rose","brown","grey"] as NoteColor[]).map((c) => (
              <button key={c} onClick={() => onSetColor(c)} className={cn("h-6 w-6 rounded-full border-2", note.color === c ? "border-foreground" : "border-transparent")} style={{ background: c === "default" ? (isDark ? "#1f1f23" : "#fff") : colorHex(c) }} aria-label={c} />
            ))}
          </div>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem onClick={onMove}>Move to…</ContextMenuItem>
      <ContextMenuItem onClick={onDuplicate}>Duplicate</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onExport}>Export…</ContextMenuItem>
      <ContextMenuItem onClick={onShare}>Share…</ContextMenuItem>
      <ContextMenuItem onClick={onInfo}>Note information</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</ContextMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative">
          {content}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-lg p-1 hover:bg-foreground/5"
                aria-label="More actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (!selecting) start(); toggle(note.id); }}>
                {isSelected ? "Deselect" : "Select"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTogglePin}>{note.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
              <DropdownMenuItem onClick={onTags}>Tags…</DropdownMenuItem>
              <DropdownMenuItem onClick={onMove}>Move…</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExport}>Export…</DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>Share…</DropdownMenuItem>
              <DropdownMenuItem onClick={onInfo}>Info</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">{menuItems}</ContextMenuContent>
    </ContextMenu>
  );
});
