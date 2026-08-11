"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder as FolderIcon, Plus, ChevronRight, FolderInput, MoreVertical, Pencil, Trash2, Copy } from "lucide-react";
import { useFolders, useNotes, useCreateFolder, useUpdateFolder, useDeleteFolder } from "@/hooks/use-data";
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

export function NotebooksView({ activeFolderId, search }: { activeFolderId: string | null; search: string }) {
  const { openFolder } = useApp();
  const { data: folders, isLoading } = useFolders();
  const { data: notes } = useNotes("all");

  if (activeFolderId) {
    const folder = folders?.find((f) => f.id === activeFolderId);
    const folderNotes = (notes || []).filter((n) => n.folderId === activeFolderId);
    return (
      <div className="space-y-3">
        <button onClick={() => openFolder(null)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          ← All notebooks
        </button>
        <NotesView
          notes={folderNotes}
          loading={isLoading}
          query={search}
          emptyTitle={`No notes in ${folder?.name || "folder"}`}
          emptyHint="Move notes here or create a new note in this folder."
        />
      </div>
    );
  }

  return <FolderList />;
}

function FolderList() {
  const { data: folders, isLoading } = useFolders();
  const { openFolder } = useApp();
  const createFolder = useCreateFolder();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<NoteColor>("default");

  const submit = () => {
    if (!name.trim()) return;
    createFolder.mutate({ name: name.trim(), color }, { onSuccess: () => { toast.success("Folder created"); setName(""); setColor("default"); setNewOpen(false); } });
  };

  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="ls-skeleton rounded-2xl h-24" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{folders?.length || 0} notebooks</p>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full"><Plus className="h-4 w-4 mr-1" /> New notebook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New notebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input placeholder="Notebook name" value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
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

      {(!folders || folders.length === 0) ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <FolderIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No notebooks yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Organize your notes into notebooks for work, personal, ideas and more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {folders.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="group relative rounded-2xl border border-border/60 bg-card p-4 elev-1 hover:elev-2 transition-shadow cursor-pointer ls-ripple"
                onClick={() => { haptic(); openFolder(f.id); }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: f.color !== "default" ? `${colorHex(f.color as NoteColor)}1a` : "var(--accent)" }}>
                    <FolderIcon className="h-5 w-5" style={{ color: f.color !== "default" ? colorHex(f.color as NoteColor) : "var(--primary)" }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{f.name}</h3>
                    <p className="text-xs text-muted-foreground">{f.noteCount} note{f.noteCount !== 1 ? "s" : ""}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <FolderMenu folder={f} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FolderMenu({ folder }: { folder: any }) {
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState<NoteColor>(folder.color);
  const [delOpen, setDelOpen] = useState(false);
  const { data: folders } = useFolders();

  const saveEdit = () => {
    updateFolder.mutate({ id: folder.id, name, color }, { onSuccess: () => { toast.success("Notebook renamed"); setEditOpen(false); } });
  };
  const doDelete = (mode: string, target?: string) => {
    deleteFolder.mutate({ id: folder.id, mode, targetFolderId: target }, { onSuccess: () => { toast.success("Notebook deleted"); setDelOpen(false); } });
  };

  return (
    <>
      <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 hover:bg-foreground/5" aria-label="Folder actions">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDelOpen(true)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename notebook</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="grid grid-cols-9 gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.id} onClick={() => setColor(c.id)} className={cn("h-7 w-7 rounded-full border-2", color === c.id ? "border-foreground" : "border-transparent")} style={{ background: c.id === "default" ? "var(--card)" : c.hex }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete “{folder.name}”?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Choose what happens to the notes inside this notebook.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" className="w-full justify-start" onClick={() => doDelete("allNotes")}>
              <FolderInput className="h-4 w-4 mr-2" /> Move notes to All Notes
            </Button>
            {folders && folders.filter((f) => f.id !== folder.id).length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start"><Copy className="h-4 w-4 mr-2" /> Move to another notebook…</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {folders.filter((f) => f.id !== folder.id).map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => doDelete("moveAll", f.id)}>{f.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="destructive" className="w-full justify-start" onClick={() => doDelete("trash")}>
              <Trash2 className="h-4 w-4 mr-2" /> Move notes to Trash
            </Button>
            <Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
