"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag as TagIcon, Plus, MoreVertical, Pencil, Trash2, Hash } from "lucide-react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, useNotes } from "@/hooks/use-data";
import { useApp } from "@/lib/app-store";
import { NotesView } from "@/components/notes-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { colorHex, NOTE_COLORS, type NoteColor } from "@/lib/types";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";

export function TagsView({ activeTagId, search }: { activeTagId: string | null; search: string }) {
  const { data: tags, isLoading } = useTags();
  const { data: notes } = useNotes("all");
  const createTag = useCreateTag();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<NoteColor>("default");

  const submit = () => {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) return;
    createTag.mutate({ name: clean, color }, { onSuccess: () => { toast.success("Tag created"); setName(""); setColor("default"); setNewOpen(false); } });
  };

  // If a tag is selected, show its notes
  if (activeTagId) {
    const tag = tags?.find((t) => t.id === activeTagId);
    const tagNotes = (notes || []).filter((n) => n.tags.some((t) => t.id === activeTagId));
    return (
      <div className="space-y-3">
        <button onClick={() => useApp.getState().openTag(null)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          ← All tags
        </button>
        <NotesView
          notes={tagNotes}
          loading={isLoading}
          query={search}
          emptyTitle={`No notes tagged #${tag?.name || ""}`}
          emptyHint="Notes with this tag will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tags?.length || 0} tags</p>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full"><Plus className="h-4 w-4 mr-1" /> New tag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New tag</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="tag-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="pl-9" onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
              <div className="grid grid-cols-9 gap-2">
                {NOTE_COLORS.map((c) => (
                  <button key={c.id} onClick={() => setColor(c.id)} className={cn("h-7 w-7 rounded-full border-2", color === c.id ? "border-foreground" : "border-transparent")} style={{ background: c.id === "default" ? "var(--card)" : c.hex }} aria-label={c.label} />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!tags || tags.length === 0) ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <TagIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No tags yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Tags help you group and find notes fast. Type # in a note or create one here.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TagChip({ tag }: { tag: any }) {
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const { openTag } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<NoteColor>(tag.color);

  const save = () => {
    updateTag.mutate({ id: tag.id, name, color }, { onSuccess: () => { toast.success("Tag updated"); setEditOpen(false); } });
  };
  const del = () => {
    deleteTag.mutate(tag.id, { onSuccess: () => { toast.success("Tag deleted", { description: "Notes were not removed." }); setEditOpen(false); } });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <button
        onClick={() => { haptic(); openTag(tag.id); }}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border/60 bg-card ls-ripple hover:elev-1 transition-all"
      >
        {tag.color !== "default" ? (
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorHex(tag.color as NoteColor) }} />
        ) : (
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{tag.name}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">{tag.noteCount}</span>
      </button>
      <div className="absolute -top-1 -right-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center" aria-label="Tag actions">
              <MoreVertical className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={del} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit tag</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="pl-9" />
            </div>
            <div className="grid grid-cols-9 gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.id} onClick={() => setColor(c.id)} className={cn("h-7 w-7 rounded-full border-2", color === c.id ? "border-foreground" : "border-transparent")} style={{ background: c.id === "default" ? "var(--card)" : c.hex }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
