"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bold, Italic, Underline, Strikethrough, List, ListOrdered, CheckSquare,
  Heading1, Heading2, Heading3, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  Paperclip, Mic, Pencil, Table as TableIcon, Minus, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Undo, Redo, Palette, Tag as TagIcon, Folder as FolderIcon, MoreVertical,
  Pin, Lock, Unlock, Save, ChevronDown, Eraser, IndentIncrease, IndentDecrease,
  Type, Highlighter, Hash, Sparkles, X, Clock, Eye, Trash2, Info, Copy, Move, Plus,
} from "lucide-react";
import { useApp } from "@/lib/app-store";
import { useSettingsStore } from "@/lib/stores";
import { useNote, useCreateNote, useUpdateNote, useDeleteNote, useDuplicateNote, useFolders, useTags, useCreateTag, useNoteHistory, useRestoreHistoryNote } from "@/hooks/use-data";
import { serializeBlocks, blocksToExcerpt, checklistProgress, relativeTime, formatDateTime, uid } from "@/lib/notes";
import { colorHex, colorBg, NOTE_COLORS, FONT_OPTIONS, type NoteColor, type ContentBlock, type NoteType } from "@/lib/types";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";
import { DrawingCanvas } from "@/components/drawing-canvas";

export function NoteEditor() {
  const { editorOpen, editorNoteId, editorNewType, editorNewColor, editorNewFolderId, editorNewPrivate, closeEditor, setInfoNote, openMove } = useApp();
  const settings = useSettingsStore((s) => s.settings);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const activeNoteId = noteId || (loadedId && loadedId !== "new" ? loadedId : null);

  if (!editorOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      <EditorInner
        noteId={editorNoteId}
        newType={editorNewType}
        newColor={editorNewColor}
        newFolderId={editorNewFolderId}
        newPrivate={editorNewPrivate}
        isDark={isDark}
        onClose={closeEditor}
        onInfo={(id) => setInfoNote(id)}
        onMove={(id) => openMove([id])}
      />
    </motion.div>
  );
}

function EditorInner({ noteId, newType, newColor, newFolderId, newPrivate, isDark, onClose, onInfo, onMove }: any) {
  const settings = useSettingsStore((s) => s.settings);
  const existing = useNote(noteId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const duplicateNote = useDuplicateNote();
  const { data: folders } = useFolders();
  const { data: tags } = useTags();
  const createTag = useCreateTag();

  const [mode, setMode] = useState<"basic" | "advanced">(settings.defaultEditor);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [color, setColor] = useState<NoteColor>("default");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [type, setType] = useState<NoteType>("text");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [colorOpen, setColorOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [linkReviewOpen, setLinkReviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const saveTimer = useRef<any>(null);
  const createdRef = useRef<string | null>(null);

  // Initialize from existing or new
  useEffect(() => {
    if (noteId && existing.data) {
      if (loadedId !== noteId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(existing.data.title);
        setBlocks(existing.data.content);
        setColor(existing.data.color);
        setFolderId(existing.data.folderId);
        setIsPinned(existing.data.isPinned);
        setIsPrivate(existing.data.isPrivate);
        setNoteTags(existing.data.tags.map((t: any) => t.name));
        setType(existing.data.type);
        setLoadedId(noteId);
        setSaved("saved");
      }
    } else if (!noteId && loadedId !== "new") {
      // new note
      setTitle("");
      const initType = newType || "text";
      setType(initType);
      const c = newColor || (settings.defaultNoteColorMode === "random" ? NOTE_COLORS[1 + Math.floor(Math.random() * 14)].id : settings.defaultNoteColor);
      setColor(c as NoteColor);
      setFolderId(newFolderId ?? null);
      setIsPrivate(newPrivate ?? false);
      setNoteTags([]);
      setBlocks(
        initType === "checklist"
          ? [{ id: uid(), type: "checklist", items: [] }]
          : [{ id: uid(), type: "text", text: "", align: "left", marks: [] }]
      );
      setLoadedId("new");
      setSaved("idle");
    }
  }, [noteId, existing.data]);

  // Autosave
  const doSave = useCallback(async (silent = false) => {
    if (!silent) setSaved("saving");
    const id = noteId || createdRef.current;
    const payload = {
      title: title.trim(),
      content: blocks,
      color,
      folderId,
      isPinned,
      isPrivate,
      type,
      tags: noteTags,
    };
    try {
      if (id) {
        await updateNote.mutateAsync({ id, ...payload });
      } else {
        const created = await createNote.mutateAsync({ ...payload, color, colorMode: settings.defaultNoteColorMode });
        createdRef.current = created.id;
        setLoadedId(created.id);
      }
      setSaved("saved");
      setDirty(false);
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
      setSaved("idle");
    }
  }, [noteId, title, blocks, color, folderId, isPinned, isPrivate, type, noteTags, updateNote, createNote, settings.defaultNoteColorMode]);

  // debounce autosave
  useEffect(() => {
    if (!loadedId) return;
    if (!dirty) return;
    if (!settings.autoSave) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(true), settings.autoSaveInterval * 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, blocks, color, folderId, isPinned, isPrivate, noteTags, type, dirty, loadedId, settings.autoSave, settings.autoSaveInterval, doSave]);

  const markDirty = () => setDirty(true);

  const handleClose = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (dirty || title.trim() || blocks.some((b) => (b.type === "text" || b.type === "heading" || b.type === "quote" ? b.text : b.type === "code" ? b.code : (b.type === "checklist" || b.type === "bullet" || b.type === "numbered") ? b.items.length : true))) {
      await doSave(true);
      if (title.trim() || blocks.some((b: any) => b.text || b.code || b.items?.length)) {
        toast.success("Note saved");
      }
    }
    onClose();
  };

  // Block operations
  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } as ContentBlock : b)));
    markDirty();
  };
  const addBlock = (block: ContentBlock, afterId?: string) => {
    setBlocks((bs) => {
      if (!afterId) return [...bs, block];
      const idx = bs.findIndex((b) => b.id === afterId);
      const out = [...bs];
      out.splice(idx + 1, 0, block);
      return out;
    });
    markDirty();
  };
  const removeBlock = (id: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    markDirty();
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === id);
      const ni = idx + dir;
      if (ni < 0 || ni >= bs.length) return bs;
      const out = [...bs];
      [out[idx], out[ni]] = [out[ni], out[idx]];
      return out;
    });
    markDirty();
  };

  const progress = checklistProgress(blocks);
  const editorFont = settings.editorFont;
  const editorFontSize = settings.editorFontSize;
  const fontFamily = mapFontFamily(editorFont);

  return (
    <div className="flex flex-col h-full" style={{ background: colorBg(color, isDark) }}>
      {/* Top bar */}
      <header className="flex items-center gap-1 px-2 sm:px-3 h-14 border-b border-border/60 bg-background/60 backdrop-blur-md ls-no-print">
        <Button variant="ghost" size="icon" className="rounded-full ls-ripple" onClick={handleClose} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full", saved === "saving" ? "bg-amber-500 animate-pulse" : saved === "saved" ? "bg-emerald-500" : "bg-muted-foreground/40")} />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : "Unsaved"}
          </span>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsPinned(!isPinned); markDirty(); }} aria-label="Pin">
          <Pin className={cn("h-5 w-5", isPinned && "text-primary fill-primary")} />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsPrivate(!isPrivate); markDirty(); toast.success(isPrivate ? "Removed from PrivateSafe" : "Moved to PrivateSafe"); }} aria-label="Private">
          {isPrivate ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5" />}
        </Button>
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Note color">
              <Palette className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="text-xs font-medium mb-2">Note color</div>
            <div className="grid grid-cols-6 gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.id} onClick={() => { setColor(c.id); markDirty(); setColorOpen(false); }} className={cn("h-8 w-8 rounded-full border-2", color === c.id ? "border-foreground" : "border-transparent")} style={{ background: c.id === "default" ? (isDark ? "#1f1f23" : "#fff") : c.hex }} aria-label={c.label} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setTagsOpen(true)} aria-label="Tags">
          <TagIcon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => doSave()} aria-label="Save">
          <Save className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="More"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setMode(mode === "basic" ? "advanced" : "basic")}>
              <Type className="h-4 w-4 mr-2" /> Switch to {mode === "basic" ? "Advanced" : "Basic"} editor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMoveOpen(true)}><Move className="h-4 w-4 mr-2" /> Move to…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { if (noteId || createdRef.current) duplicateNote.mutate(noteId || createdRef.current!, { onSuccess: () => toast.success("Note duplicated") }); }}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLinkReviewOpen(true)}><LinkIcon className="h-4 w-4 mr-2" /> Review links</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}><Clock className="h-4 w-4 mr-2" /> Note history</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { if (noteId || createdRef.current) onInfo(noteId || createdRef.current!); }}><Info className="h-4 w-4 mr-2" /> Note information</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
              const id = noteId || createdRef.current;
              if (id) { deleteNote.mutate(id, { onSuccess: () => { toast.success("Note moved to Trash"); onClose(); } }); }
              else onClose();
            }}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Title */}
      <div className="px-4 sm:px-6 pt-4 ls-print-area">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          placeholder="Title"
          className="w-full bg-transparent text-2xl sm:text-3xl font-bold outline-none placeholder:text-muted-foreground/40"
          style={{ fontFamily }}
          aria-label="Note title"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
          {folderId && folders?.find((f) => f.id === folderId) && (
            <span className="inline-flex items-center gap-1"><FolderIcon className="h-3 w-3" /> {folders.find((f) => f.id === folderId)?.name}</span>
          )}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {relativeTime(existing.data?.updatedAt || new Date())}</span>
          {progress.total > 0 && <span className="inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {progress.done}/{progress.total}</span>}
          {noteTags.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">#{t}</span>
          ))}
        </div>
      </div>

      {/* Content blocks */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 ls-prose" style={{ fontFamily, fontSize: editorFontSize }}>
        {blocks.map((b, i) => (
          <BlockEditor
            key={b.id}
            block={b}
            mode={mode}
            spellCheck={settings.spellCheck}
            onChange={(patch) => updateBlock(b.id, patch)}
            onRemove={() => removeBlock(b.id)}
            onMoveUp={() => moveBlock(b.id, -1)}
            onMoveDown={() => moveBlock(b.id, 1)}
            onAddAfter={(nb) => addBlock(nb, b.id)}
            isDark={isDark}
            onDraw={() => setDrawOpen(true)}
          />
        ))}
        {blocks.length === 0 && (
          <p className="text-muted-foreground/50 italic">Start writing…</p>
        )}
        <button
          onClick={() => addBlock({ id: uid(), type: "text", text: "", align: "left", marks: [] } as ContentBlock)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          + Add paragraph
        </button>
      </div>

      {/* Formatting toolbar */}
      <FormatToolbar
        mode={mode}
        onToggleMode={() => setMode(mode === "basic" ? "advanced" : "basic")}
        onAddBlock={addBlock}
        onDraw={() => setDrawOpen(true)}
      />

      {/* Tags sheet */}
      <TagsSheet open={tagsOpen} onOpenChange={setTagsOpen} selected={noteTags} onToggle={(t) => { setNoteTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]); markDirty(); }} tags={tags || []} onCreate={(name) => createTag.mutate({ name }, { onSuccess: () => { setNoteTags((p) => [...p, name]); markDirty(); } })} />

      {/* Move dialog */}
      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} currentId={folderId} onMove={(id) => { setFolderId(id); markDirty(); setMoveOpen(false); toast.success("Note moved"); }} />

      {/* Drawing canvas */}
      <Sheet open={drawOpen} onOpenChange={setDrawOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="px-4 py-2 border-b">
            <SheetTitle>Sketch</SheetTitle>
          </SheetHeader>
          <DrawingCanvas onSave={(dataUrl) => { addBlock({ id: uid(), type: "drawing", dataUrl, name: "Sketch" } as ContentBlock); setDrawOpen(false); toast.success("Drawing saved"); }} />
        </SheetContent>
      </Sheet>

      {/* Link review */}
      <LinkReviewDialog open={linkReviewOpen} onOpenChange={setLinkReviewOpen} blocks={blocks} />

      {/* Note history */}
      <NoteHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} noteId={activeNoteId} onRestored={(t: string, b: ContentBlock[]) => { setTitle(t); setBlocks(b); markDirty(); }} />
    </div>
  );
}

function mapFontFamily(f: string): string {
  const map: Record<string, string> = {
    "Raleway": "'Raleway', sans-serif",
    "Roboto": "'Roboto', sans-serif",
    "Ruda": "'Ruda', sans-serif",
    "Ubuntu": "'Ubuntu', sans-serif",
    "Zilla Slab": "'Zilla Slab', serif",
    "Sans-serif": "system-ui, sans-serif",
    "Serif": "Georgia, serif",
    "Monospace": "ui-monospace, monospace",
    "Inter": "'Inter', system-ui, sans-serif",
    "Poppins": "'Poppins', sans-serif",
    "Lora": "'Lora', serif",
    "Playfair Display": "'Playfair Display', serif",
    "JetBrains Mono": "'JetBrains Mono', monospace",
  };
  return map[f] || "system-ui, sans-serif";
}

// ---- Block editor ----
function BlockEditor({ block, mode, spellCheck, onChange, onRemove, onMoveUp, onMoveDown, onAddAfter, isDark, onDraw }: any) {
  const [showActions, setShowActions] = useState(false);

  const wrapInline = (mark: "bold" | "italic" | "underline" | "strike") => {
    if (block.type !== "text") return;
    const ta = document.activeElement as HTMLTextAreaElement;
    // simple: toggle a whole-text mark
    const marks = block.marks || [];
    const existing = marks.find((m: any) => m[mark]);
    let next;
    if (existing) next = marks.filter((m: any) => !m[mark]);
    else next = [...marks, { start: 0, end: block.text.length, [mark]: true }];
    onChange({ marks: next });
  };

  switch (block.type) {
    case "text":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Write something…"
            spellCheck={spellCheck}
            rows={1}
            className="w-full bg-transparent outline-none resize-none py-1 leading-relaxed"
            style={{ textAlign: block.align || "left" }}
            onInput={(e) => { (e.target as HTMLTextAreaElement).style.height = "auto"; (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + "px"; }}
            ref={(el) => { if (el && !el.style.height) el.style.height = "auto"; }}
          />
        </BlockWrap>
      );
    case "heading":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="flex items-center gap-1">
            <select value={block.level} onChange={(e) => onChange({ level: Number(e.target.value) })} className="text-xs bg-muted rounded-md px-1 py-0.5">
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <input value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Heading" spellCheck={spellCheck} className="flex-1 bg-transparent outline-none font-bold" style={{ fontSize: block.level === 1 ? "1.875rem" : block.level === 2 ? "1.5rem" : "1.25rem", textAlign: block.align }} />
          </div>
        </BlockWrap>
      );
    case "quote":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Quote" spellCheck={spellCheck} rows={1} className="w-full bg-transparent outline-none resize-none border-l-2 border-primary pl-3 italic text-muted-foreground" onInput={(e:any)=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} />
        </BlockWrap>
      );
    case "code":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={block.language || ""} onChange={(e) => onChange({ language: e.target.value })} placeholder="language" className="text-[11px] bg-transparent outline-none w-24 text-muted-foreground" />
            </div>
            <textarea value={block.code} onChange={(e) => onChange({ code: e.target.value })} placeholder="// code" spellCheck={false} rows={3} className="w-full bg-transparent outline-none resize-none font-mono text-sm" onInput={(e:any)=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} />
          </div>
        </BlockWrap>
      );
    case "divider":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <hr className="my-3 border-border" />
        </BlockWrap>
      );
    case "checklist":
      return <ChecklistBlock block={block} spellCheck={spellCheck} onChange={onChange} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />;
    case "bullet":
    case "numbered":
      return <ListBlock block={block} ordered={block.type === "numbered"} spellCheck={spellCheck} onChange={onChange} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />;
    case "image":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <figure className="my-2">
            {block.src ? <img src={block.src} alt={block.name || ""} className="rounded-xl max-w-full" /> : (
              <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-accent/40">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to add image</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => onChange({ src: r.result, name: f.name }); r.readAsDataURL(f); } }} />
              </label>
            )}
            <input value={block.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption (optional)" className="w-full text-center text-xs text-muted-foreground bg-transparent outline-none mt-1" />
          </figure>
        </BlockWrap>
      );
    case "audio":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl border border-border/60 p-3 flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="text-sm flex-1">{block.name || "Audio note"}</span>
            {block.src && <audio controls src={block.src} className="h-8" />}
            {!block.src && <AudioRecorder onRecord={(src, name) => onChange({ src, name })} />}
          </div>
        </BlockWrap>
      );
    case "file":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl border border-border/60 p-3 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{block.name || "Attach a file"}</div>
              {block.size > 0 && <div className="text-[10px] text-muted-foreground">{(block.size/1024).toFixed(1)} KB</div>}
            </div>
            {block.src && <a href={block.src} download={block.name} className="text-xs text-primary">Download</a>}
            <label className="text-xs px-2 py-1 rounded-md bg-accent cursor-pointer">
              {block.src ? "Replace" : "Attach"}
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => onChange({ src: r.result, name: f.name, size: f.size, mime: f.type }); r.readAsDataURL(f); } }} />
            </label>
          </div>
        </BlockWrap>
      );
    case "drawing":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          {block.dataUrl ? <img src={block.dataUrl} alt="Drawing" className="rounded-xl max-w-full my-2 border border-border/60" /> : <div className="text-muted-foreground text-sm">No drawing</div>}
        </BlockWrap>
      );
    case "table":
      return <TableBlock block={block} onChange={onChange} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />;
    case "link":
    case "bookmark":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl border border-border/60 p-3 flex flex-col gap-2">
            <input value={block.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" className="bg-transparent outline-none text-sm font-medium" />
            <input value={block.url || ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…" className="bg-transparent outline-none text-xs text-primary underline" />
            {block.type === "bookmark" && <textarea value={block.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} className="bg-transparent outline-none text-xs text-muted-foreground resize-none" />}
            {block.url && <a href={block.url} target="_blank" rel="noreferrer" className="text-xs text-primary">Open link ↗</a>}
          </div>
        </BlockWrap>
      );
    case "smart":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-xs font-semibold uppercase tracking-wide text-primary">Smart Card</span></div>
            <input value={block.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" className="bg-transparent outline-none text-sm font-medium" />
            <input value={block.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder="Subtitle" className="bg-transparent outline-none text-xs" />
            <textarea value={block.description || ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="Description" rows={2} className="bg-transparent outline-none text-xs text-muted-foreground resize-none" />
            <input value={block.url || ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…" className="bg-transparent outline-none text-xs text-primary underline" />
          </div>
        </BlockWrap>
      );
    case "toc":
      return (
        <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">📑 {block.title || "Table of Contents"}</div>
        </BlockWrap>
      );
    default:
      return null;
  }
}

function BlockWrap({ children, showActions, setShowActions, onRemove, onMoveUp, onMoveDown }: any) {
  return (
    <div className="group relative" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <AnimatePresence>
        {showActions && (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="absolute -left-8 top-1 flex flex-col gap-0.5">
            <button onClick={onMoveUp} className="p-0.5 rounded hover:bg-foreground/5 text-muted-foreground" aria-label="Move up"><ArrowLeft className="h-3 w-3 -rotate-90" /></button>
            <button onClick={onMoveDown} className="p-0.5 rounded hover:bg-foreground/5 text-muted-foreground" aria-label="Move down"><ArrowLeft className="h-3 w-3 rotate-90" /></button>
            <button onClick={onRemove} className="p-0.5 rounded hover:bg-destructive/10 text-destructive" aria-label="Remove block"><X className="h-3 w-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

function ChecklistBlock({ block, spellCheck, onChange, onRemove, onMoveUp, onMoveDown }: any) {
  const [showActions, setShowActions] = useState(false);
  const addItem = () => onChange({ items: [...block.items, { id: uid(), text: "", checked: false, indent: 0 }] });
  const updateItem = (id: string, patch: any) => onChange({ items: block.items.map((i: any) => i.id === id ? { ...i, ...patch } : i) });
  const removeItem = (id: string) => onChange({ items: block.items.filter((i: any) => i.id !== id) });
  const moveItem = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= block.items.length) return;
    const out = [...block.items];
    [out[idx], out[ni]] = [out[ni], out[idx]];
    onChange({ items: out });
  };

  return (
    <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="space-y-1">
        {block.items.map((item: any, idx: number) => (
          <div key={item.id} className="flex items-center gap-2 group/item">
            <button onClick={() => updateItem(item.id, { checked: !item.checked })} className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors", item.checked ? "bg-primary border-primary" : "border-muted-foreground/40")} aria-label={item.checked ? "Mark incomplete" : "Mark complete"}>
              {item.checked && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
            </button>
            <input
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
              placeholder="List item"
              spellCheck={spellCheck}
              className={cn("flex-1 bg-transparent outline-none text-sm", item.checked && "line-through text-muted-foreground")}
              style={{ marginLeft: (item.indent || 0) * 16 }}
            />
            <div className="opacity-0 group-hover/item:opacity-100 flex">
              <button onClick={() => updateItem(item.id, { indent: Math.max(0, (item.indent || 0) - 1) })} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label="Decrease indent"><IndentDecrease className="h-3 w-3" /></button>
              <button onClick={() => updateItem(item.id, { indent: (item.indent || 0) + 1 })} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label="Increase indent"><IndentIncrease className="h-3 w-3" /></button>
              <button onClick={() => moveItem(idx, -1)} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label="Move up">↑</button>
              <button onClick={() => moveItem(idx, 1)} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label="Move down">↓</button>
              <button onClick={() => removeItem(item.id)} className="p-0.5 text-destructive hover:text-destructive" aria-label="Remove item"><X className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1">+ Add item</button>
      </div>
    </BlockWrap>
  );
}

function ListBlock({ block, ordered, spellCheck, onChange, onRemove, onMoveUp, onMoveDown }: any) {
  const [showActions, setShowActions] = useState(false);
  const addItem = () => onChange({ items: [...block.items, { id: uid(), text: "", indent: 0 }] });
  const updateItem = (id: string, patch: any) => onChange({ items: block.items.map((i: any) => i.id === id ? { ...i, ...patch } : i) });
  return (
    <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="space-y-1">
        {block.items.map((item: any, idx: number) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-sm mt-0.5 shrink-0">{ordered ? `${idx + 1}.` : "•"}</span>
            <input value={item.text} onChange={(e) => updateItem(item.id, { text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder="List item" spellCheck={spellCheck} className="flex-1 bg-transparent outline-none text-sm" style={{ marginLeft: (item.indent || 0) * 16 }} />
          </div>
        ))}
        {block.items.length === 0 && <span className="text-xs text-muted-foreground">Empty list</span>}
        <button onClick={addItem} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1">+ Add item</button>
      </div>
    </BlockWrap>
  );
}

function TableBlock({ block, onChange, onRemove, onMoveUp, onMoveDown }: any) {
  const [showActions, setShowActions] = useState(false);
  const setCell = (r: number, c: number, val: string) => {
    const rows = block.rows.map((row: string[], ri: number) => row.map((cell: string, ci: number) => ri === r && ci === c ? val : cell));
    onChange({ rows });
  };
  const addRow = () => onChange({ rows: [...block.rows, Array(block.rows[0]?.length || 2).fill("")] });
  const addCol = () => onChange({ rows: block.rows.map((r: string[]) => [...r, ""]) });
  return (
    <BlockWrap showActions={showActions} setShowActions={setShowActions} onRemove={onRemove} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="overflow-x-auto my-2 rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <tbody>
            {block.rows.map((row: string[], ri: number) => (
              <tr key={ri} className={ri === 0 && block.header ? "bg-muted/40 font-medium" : ""}>
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className="border border-border/60 p-1"><input value={cell} onChange={(e) => setCell(ri, ci, e.target.value)} className="w-full bg-transparent outline-none text-sm px-1" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button onClick={addRow} className="text-xs text-muted-foreground hover:text-foreground">+ Row</button>
        <button onClick={addCol} className="text-xs text-muted-foreground hover:text-foreground">+ Column</button>
        <button onClick={() => onChange({ header: !block.header })} className="text-xs text-muted-foreground hover:text-foreground">{block.header ? "No header row" : "First row as header"}</button>
      </div>
    </BlockWrap>
  );
}

// Audio recorder
function AudioRecorder({ onRecord }: { onRecord: (src: string, name: string) => void }) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const r = new FileReader();
        r.onload = () => onRecord(r.result as string, `Recording ${new Date().toLocaleTimeString()}`);
        r.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone permission denied");
    }
  };
  const stop = () => { mediaRef.current?.stop(); setRecording(false); };
  return <Button size="sm" variant="outline" onClick={recording ? stop : start} className="rounded-full"><Mic className={cn("h-4 w-4 mr-1", recording && "animate-pulse text-destructive")} /> {recording ? "Stop" : "Record"}</Button>;
}

// Format toolbar
function FormatToolbar({ mode, onToggleMode, onAddBlock, onDraw }: any) {
  const [open, setOpen] = useState(false);
  const tools = [
    { icon: Heading1, label: "Heading", action: () => onAddBlock({ id: uid(), type: "heading", text: "", level: 1, align: "left" }) },
    { icon: Heading2, label: "Subheading", action: () => onAddBlock({ id: uid(), type: "heading", text: "", level: 2, align: "left" }) },
    { icon: Quote, label: "Quote", action: () => onAddBlock({ id: uid(), type: "quote", text: "" }) },
    { icon: Code, label: "Code block", action: () => onAddBlock({ id: uid(), type: "code", code: "", language: "text" }) },
    { icon: CheckSquare, label: "Checklist", action: () => onAddBlock({ id: uid(), type: "checklist", items: [] }) },
    { icon: List, label: "Bullet list", action: () => onAddBlock({ id: uid(), type: "bullet", items: [] }) },
    { icon: ListOrdered, label: "Numbered list", action: () => onAddBlock({ id: uid(), type: "numbered", items: [] }) },
    { icon: ImageIcon, label: "Image", action: () => onAddBlock({ id: uid(), type: "image", src: "", name: "" }) },
    { icon: Mic, label: "Audio", action: () => onAddBlock({ id: uid(), type: "audio", src: "", name: "" }) },
    { icon: Paperclip, label: "File", action: () => onAddBlock({ id: uid(), type: "file", src: "", name: "", size: 0, mime: "" }) },
    { icon: Pencil, label: "Drawing", action: onDraw },
    { icon: TableIcon, label: "Table", action: () => onAddBlock({ id: uid(), type: "table", rows: [["",""]], header: true }) },
    { icon: LinkIcon, label: "Link", action: () => onAddBlock({ id: uid(), type: "link", url: "", title: "" }) },
    { icon: Sparkles, label: "Smart card", action: () => onAddBlock({ id: uid(), type: "smart", title: "", kind: "web" }) },
    { icon: Minus, label: "Divider", action: () => onAddBlock({ id: uid(), type: "divider" }) },
  ];
  const advanced = [
    { icon: Hash, label: "Table of contents", action: () => onAddBlock({ id: uid(), type: "toc", title: "Contents" }) },
  ];

  return (
    <div className="border-t border-border/60 bg-background/80 backdrop-blur-md px-2 py-2 ls-no-print overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1 min-w-max">
        <Button variant="ghost" size="sm" onClick={onToggleMode} className="rounded-full text-xs shrink-0">
          <Type className="h-4 w-4 mr-1" /> {mode === "basic" ? "Advanced" : "Basic"}
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full text-xs shrink-0"><Plus className="h-4 w-4" /> Insert</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="grid grid-cols-2 gap-1">
              {tools.map((t) => { const Icon = t.icon; return <button key={t.label} onClick={() => { t.action(); setOpen(false); }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm text-left"><Icon className="h-4 w-4" /> {t.label}</button>; })}
              {mode === "advanced" && advanced.map((t) => { const Icon = t.icon; return <button key={t.label} onClick={() => { t.action(); setOpen(false); }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm text-left"><Icon className="h-4 w-4" /> {t.label}</button>; })}
            </div>
          </PopoverContent>
        </Popover>
        <div className="h-5 w-px bg-border mx-1" />
        <ToolBtn icon={Bold} label="Bold" />
        <ToolBtn icon={Italic} label="Italic" />
        <ToolBtn icon={Underline} label="Underline" />
        <ToolBtn icon={Strikethrough} label="Strikethrough" />
        {mode === "advanced" && (
          <>
            <ToolBtn icon={Highlighter} label="Highlight" />
            <ToolBtn icon={AlignLeft} label="Align left" />
            <ToolBtn icon={AlignCenter} label="Align center" />
            <ToolBtn icon={AlignRight} label="Align right" />
            <ToolBtn icon={AlignJustify} label="Justify" />
            <ToolBtn icon={IndentIncrease} label="Indent" />
            <ToolBtn icon={IndentDecrease} label="Outdent" />
            <ToolBtn icon={Eraser} label="Clear formatting" />
          </>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label }: any) {
  return (
    <Button variant="ghost" size="sm" className="rounded-full shrink-0 h-8 w-8 p-0" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// Tags sheet
function TagsSheet({ open, onOpenChange, selected, onToggle, tags, onCreate }: any) {
  const [input, setInput] = useState("");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader><SheetTitle>Tags</SheetTitle></SheetHeader>
        <div className="px-4 pb-6 space-y-3">
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="New tag name" onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onCreate(input.trim().replace(/^#/, "")); onToggle(input.trim().replace(/^#/, "")); setInput(""); } }} />
            <Button onClick={() => { if (input.trim()) { onCreate(input.trim().replace(/^#/, "")); onToggle(input.trim().replace(/^#/, "")); setInput(""); } }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => {
              const sel = selected.includes(t.name);
              return (
                <button key={t.id} onClick={() => onToggle(t.name)} className={cn("inline-flex items-center gap-1 h-8 px-3 rounded-full border text-sm", sel ? "bg-primary text-primary-foreground border-primary" : "border-border/60 bg-card")}>
                  <TagIcon className="h-3 w-3" /> {t.name}
                </button>
              );
            })}
            {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet. Type above to create one.</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Move dialog
function MoveDialog({ open, onOpenChange, currentId, onMove }: any) {
  const { data: folders } = useFolders();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Move to notebook</DialogTitle></DialogHeader>
        <div className="space-y-1 py-2 max-h-80 overflow-y-auto">
          <button onClick={() => onMove(null)} className={cn("w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm", !currentId && "bg-accent")}>
            <FolderIcon className="h-4 w-4" /> All Notes
          </button>
          {folders?.map((f: any) => (
            <button key={f.id} onClick={() => onMove(f.id)} className={cn("w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm", currentId === f.id && "bg-accent")}>
              <span className="h-2 w-2 rounded-full" style={{ background: f.color !== "default" ? colorHex(f.color as NoteColor) : "var(--muted-foreground)" }} /> {f.name} <span className="text-xs text-muted-foreground ml-auto">{f.noteCount}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Link review
function LinkReviewDialog({ open, onOpenChange, blocks }: any) {
  const links: { url: string; title?: string }[] = [];
  const urlRe = /(https?:\/\/[^\s<>"']+)/g;
  for (const b of blocks) {
    if (b.type === "link" || b.type === "bookmark" || b.type === "smart") {
      if (b.url) links.push({ url: b.url, title: b.title });
    }
    if (b.type === "text" || b.type === "heading") {
      const m = b.text.match(urlRe);
      if (m) m.forEach((u: string) => links.push({ url: u }));
    }
  }
  const dedup = Array.from(new Map(links.map((l) => [l.url, l])).values());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link review</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">LS Notes does not use a cloud service to scan or track links. These are detected locally from your note.</p>
        <div className="space-y-2 max-h-80 overflow-y-auto py-2">
          {dedup.length === 0 && <p className="text-sm text-muted-foreground">No links in this note.</p>}
          {dedup.map((l, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border/60">
              <LinkIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{l.title || l.url}</div>
                <div className="text-xs text-muted-foreground truncate">{l.url}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Total links: {dedup.length}</div>
      </DialogContent>
    </Dialog>
  );
}

// Note history revision dialog
function NoteHistoryDialog({ open, onOpenChange, noteId, onRestored }: any) {
  const { data: history, isLoading } = useNoteHistory(open ? noteId : null);
  const restore = useRestoreHistoryNote();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Revision History
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Local revision snapshots are captured on save. Select a version to restore.
        </p>
        <div className="space-y-2.5 max-h-80 overflow-y-auto py-2 pr-1">
          {isLoading && <div className="text-sm text-muted-foreground p-4 text-center">Loading revisions…</div>}
          {!isLoading && (!history || history.length === 0) && (
            <div className="text-sm text-muted-foreground p-4 text-center">No past revisions recorded yet for this note.</div>
          )}
          {history?.map((snap: any) => {
            const excerpt = blocksToExcerpt(snap.content);
            return (
              <div key={snap.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{snap.title || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(snap.createdAt)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/80 line-clamp-2 mt-0.5">{excerpt || "Empty note content"}</div>
                  <div className="text-[10px] text-muted-foreground/50 mt-1">{formatDateTime(snap.createdAt)}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-full h-8 px-3 text-xs"
                  onClick={() => {
                    if (!noteId) return;
                    restore.mutate(
                      { noteId, historyId: snap.id },
                      {
                        onSuccess: (data) => {
                          onRestored(data.title, data.content);
                          onOpenChange(false);
                          toast.success("Restored version from " + relativeTime(snap.createdAt));
                        },
                        onError: () => toast.error("Failed to restore history snapshot"),
                      }
                    );
                  }}
                  disabled={restore.isPending}
                >
                  Restore
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
