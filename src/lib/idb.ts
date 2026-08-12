// LS Notes — Local Client-Side IndexedDB Engine (ls_notes_db)
import type {
  ContentBlock,
  NoteDto,
  FolderDto,
  TagDto,
  AppSettings,
  NoteType,
  NoteColor,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  uid,
  blocksToExcerpt,
  countWords,
  countChars,
  localHash,
} from "./notes";

const DB_NAME = "ls_notes_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser environments"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains("notes")) {
        const noteStore = db.createObjectStore("notes", { keyPath: "id" });
        noteStore.createIndex("folderId", "folderId", { unique: false });
        noteStore.createIndex("isDeleted", "isDeleted", { unique: false });
        noteStore.createIndex("isArchived", "isArchived", { unique: false });
        noteStore.createIndex("isPrivate", "isPrivate", { unique: false });
        noteStore.createIndex("isFavorite", "isFavorite", { unique: false });
        noteStore.createIndex("isPinned", "isPinned", { unique: false });
        noteStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("folders")) {
        const folderStore = db.createObjectStore("folders", { keyPath: "id" });
        folderStore.createIndex("parentId", "parentId", { unique: false });
        folderStore.createIndex("order", "order", { unique: false });
      }

      if (!db.objectStoreNames.contains("tags")) {
        const tagStore = db.createObjectStore("tags", { keyPath: "id" });
        tagStore.createIndex("name", "name", { unique: true });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("history")) {
        const historyStore = db.createObjectStore("history", { keyPath: "id" });
        historyStore.createIndex("noteId", "noteId", { unique: false });
        historyStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// Generic transaction helper
async function tx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (stores: Record<string, IDBObjectStore>) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = db.transaction(names, mode);
  const stores: Record<string, IDBObjectStore> = {};
  for (const name of names) {
    stores[name] = transaction.objectStore(name);
  }

  return new Promise<T>((resolve, reject) => {
    let result: T;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    Promise.resolve()
      .then(() => fn(stores))
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        transaction.abort();
        reject(err);
      });
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Helper to compute attachment statistics
function computeAttachmentsInfo(blocks: ContentBlock[]): { size: number; count: number } {
  let count = 0;
  let size = 0;
  for (const b of blocks) {
    if (b.type === "image" || b.type === "audio" || b.type === "video" || b.type === "file" || b.type === "drawing") {
      count++;
      if ("src" in b && b.src) size += b.src.length;
      else if ("dataUrl" in b && b.dataUrl) size += b.dataUrl.length;
      else if ("size" in b && typeof b.size === "number") size += b.size;
    }
  }
  return { count, size };
}

// ---------------- NOTES API ----------------

export async function idbGetNotes(params: Record<string, string | undefined> = {}): Promise<NoteDto[]> {
  const db = await openDB();
  const transaction = db.transaction(["notes", "folders"], "readonly");
  const noteStore = transaction.objectStore("notes");
  const folderStore = transaction.objectStore("folders");

  const rawNotes = await reqToPromise<any[]>(noteStore.getAll());
  const rawFolders = await reqToPromise<any[]>(folderStore.getAll());
  const folderMap = new Map<string, string>();
  for (const f of rawFolders) folderMap.set(f.id, f.name);

  const { scope, folderId, tagId, search, color, type, pinned, favorite } = params;

  let result = rawNotes.map((n) => ({
    ...n,
    folderName: n.folderId ? folderMap.get(n.folderId) ?? null : null,
  })) as NoteDto[];

  // Filter based on scope
  switch (scope) {
    case "notebooks":
      if (folderId) result = result.filter((n) => !n.isDeleted && n.folderId === folderId);
      else result = result.filter((n) => !n.isDeleted);
      break;
    case "tags":
      if (tagId) result = result.filter((n) => !n.isDeleted && n.tags.some((t) => t.id === tagId));
      else result = result.filter((n) => !n.isDeleted);
      break;
    case "favorites":
      result = result.filter((n) => !n.isDeleted && n.isFavorite);
      break;
    case "archived":
      result = result.filter((n) => !n.isDeleted && n.isArchived);
      break;
    case "trash":
      result = result.filter((n) => n.isDeleted);
      break;
    case "private":
      result = result.filter((n) => !n.isDeleted && n.isPrivate);
      break;
    case "all":
    default:
      result = result.filter((n) => !n.isDeleted && !n.isArchived);
      break;
  }

  // Extra filters
  if (color) result = result.filter((n) => n.color === color);
  if (type) result = result.filter((n) => n.type === type);
  if (pinned === "true") result = result.filter((n) => n.isPinned);
  if (favorite === "true") result = result.filter((n) => n.isFavorite);

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((n) => {
      if (n.title.toLowerCase().includes(q)) return true;
      if (n.excerpt.toLowerCase().includes(q)) return true;
      if (n.tags.some((t) => t.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  // Sort: Pinned first, then order descending / updatedAt descending
  result.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return result;
}

export async function idbGetNote(id: string): Promise<NoteDto | null> {
  const db = await openDB();
  const transaction = db.transaction(["notes", "folders"], "readonly");
  const noteStore = transaction.objectStore("notes");
  const folderStore = transaction.objectStore("folders");

  const note = await reqToPromise<any>(noteStore.get(id));
  if (!note) return null;

  let folderName: string | null = null;
  if (note.folderId) {
    const folder = await reqToPromise<any>(folderStore.get(note.folderId));
    if (folder) folderName = folder.name;
  }

  return { ...note, folderName };
}

export async function idbCreateNote(input: {
  title?: string;
  content?: ContentBlock[];
  type?: NoteType;
  color?: NoteColor;
  folderId?: string | null;
  isPrivate?: boolean;
  tags?: string[];
}): Promise<NoteDto> {
  const now = new Date().toISOString();
  const noteId = uid();
  const blocks = input.content || [];
  const { count: attachmentCount, size: attachmentsSize } = computeAttachmentsInfo(blocks);

  // Resolve tags
  const tagsList = await idbEnsureTags(input.tags || []);

  const newNote: NoteDto = {
    id: noteId,
    title: input.title || "Untitled",
    content: blocks,
    excerpt: blocksToExcerpt(blocks),
    type: input.type || "text",
    color: input.color || "default",
    folderId: input.folderId || null,
    folderName: null,
    isPinned: false,
    isFavorite: false,
    isPrivate: !!input.isPrivate,
    isArchived: false,
    isDeleted: false,
    deletedAt: null,
    deletedFromId: null,
    wordCount: countWords(blocks),
    charCount: countChars(blocks),
    attachmentsSize,
    attachmentCount,
    tags: tagsList,
    createdAt: now,
    updatedAt: now,
    order: Date.now(),
  };

  await tx(["notes", "folders"], "readwrite", async (stores) => {
    await reqToPromise(stores.notes.put(newNote));

    // Update folder note count if in folder
    if (newNote.folderId) {
      const folder = await reqToPromise<any>(stores.folders.get(newNote.folderId));
      if (folder) {
        folder.noteCount = (folder.noteCount || 0) + 1;
        folder.updatedAt = now;
        await reqToPromise(stores.folders.put(folder));
      }
    }
  });

  return idbGetNote(noteId) as Promise<NoteDto>;
}

export async function idbUpdateNote(
  id: string,
  input: {
    title?: string;
    content?: ContentBlock[];
    color?: NoteColor;
    folderId?: string | null;
    isPinned?: boolean;
    isFavorite?: boolean;
    isPrivate?: boolean;
    isArchived?: boolean;
    type?: NoteType;
    tags?: string[];
  }
): Promise<NoteDto> {
  const now = new Date().toISOString();

  // Pre-process tags if provided
  let newTags: { id: string; name: string; color: string }[] | undefined;
  if (input.tags) {
    newTags = await idbEnsureTags(input.tags);
  }

  await tx(["notes", "folders", "history"], "readwrite", async (stores) => {
    const existing = await reqToPromise<NoteDto>(stores.notes.get(id));
    if (!existing) throw new Error("Note not found");

    // Save snapshot to history if content or title changed
    if (
      (input.content && JSON.stringify(input.content) !== JSON.stringify(existing.content)) ||
      (input.title !== undefined && input.title !== existing.title)
    ) {
      const snapshot = {
        id: uid(),
        noteId: id,
        title: existing.title,
        content: existing.content,
        createdAt: now,
      };
      await reqToPromise(stores.history.put(snapshot));
    }

    const oldFolderId = existing.folderId;
    const blocks = input.content !== undefined ? input.content : existing.content;
    const { count: attachmentCount, size: attachmentsSize } = computeAttachmentsInfo(blocks);

    const updated: NoteDto = {
      ...existing,
      title: input.title !== undefined ? input.title : existing.title,
      content: blocks,
      excerpt: blocksToExcerpt(blocks),
      wordCount: countWords(blocks),
      charCount: countChars(blocks),
      attachmentCount,
      attachmentsSize,
      color: input.color !== undefined ? input.color : existing.color,
      folderId: input.folderId !== undefined ? input.folderId : existing.folderId,
      isPinned: input.isPinned !== undefined ? input.isPinned : existing.isPinned,
      isFavorite: input.isFavorite !== undefined ? input.isFavorite : existing.isFavorite,
      isPrivate: input.isPrivate !== undefined ? input.isPrivate : existing.isPrivate,
      isArchived: input.isArchived !== undefined ? input.isArchived : existing.isArchived,
      type: input.type !== undefined ? input.type : existing.type,
      tags: newTags !== undefined ? newTags : existing.tags,
      updatedAt: now,
    };

    await reqToPromise(stores.notes.put(updated));

    // Handle folder note count adjustments
    if (oldFolderId !== updated.folderId) {
      if (oldFolderId) {
        const oldFolder = await reqToPromise<any>(stores.folders.get(oldFolderId));
        if (oldFolder) {
          oldFolder.noteCount = Math.max(0, (oldFolder.noteCount || 0) - 1);
          await reqToPromise(stores.folders.put(oldFolder));
        }
      }
      if (updated.folderId) {
        const newFolder = await reqToPromise<any>(stores.folders.get(updated.folderId));
        if (newFolder) {
          newFolder.noteCount = (newFolder.noteCount || 0) + 1;
          await reqToPromise(stores.folders.put(newFolder));
        }
      }
    }
  });

  return idbGetNote(id) as Promise<NoteDto>;
}

export async function idbDeleteNote(id: string): Promise<{ ok: boolean }> {
  const now = new Date().toISOString();
  await tx(["notes", "folders"], "readwrite", async (stores) => {
    const note = await reqToPromise<NoteDto>(stores.notes.get(id));
    if (!note) return;

    note.isDeleted = true;
    note.deletedAt = now;
    note.deletedFromId = note.folderId;
    note.updatedAt = now;
    await reqToPromise(stores.notes.put(note));

    if (note.folderId) {
      const folder = await reqToPromise<any>(stores.folders.get(note.folderId));
      if (folder) {
        folder.noteCount = Math.max(0, (folder.noteCount || 0) - 1);
        await reqToPromise(stores.folders.put(folder));
      }
    }
  });
  return { ok: true };
}

export async function idbRestoreNote(id: string): Promise<{ ok: boolean }> {
  const now = new Date().toISOString();
  await tx(["notes", "folders"], "readwrite", async (stores) => {
    const note = await reqToPromise<NoteDto>(stores.notes.get(id));
    if (!note) return;

    note.isDeleted = false;
    note.deletedAt = null;
    note.updatedAt = now;
    await reqToPromise(stores.notes.put(note));

    if (note.folderId) {
      const folder = await reqToPromise<any>(stores.folders.get(note.folderId));
      if (folder) {
        folder.noteCount = (folder.noteCount || 0) + 1;
        await reqToPromise(stores.folders.put(folder));
      }
    }
  });
  return { ok: true };
}

export async function idbPermanentDeleteNote(id: string): Promise<{ ok: boolean }> {
  await tx(["notes", "history"], "readwrite", async (stores) => {
    await reqToPromise(stores.notes.delete(id));
    // Clear history snapshots
    const historyIdx = stores.history.index("noteId");
    const historyReq = historyIdx.getAllKeys(id);
    const keys = await reqToPromise<IDBValidKey[]>(historyReq);
    for (const key of keys) {
      await reqToPromise(stores.history.delete(key));
    }
  });
  return { ok: true };
}

export async function idbDuplicateNote(id: string): Promise<NoteDto> {
  const existing = await idbGetNote(id);
  if (!existing) throw new Error("Note not found");

  const dup = await idbCreateNote({
    title: `${existing.title} (Copy)`,
    content: JSON.parse(JSON.stringify(existing.content)),
    type: existing.type,
    color: existing.color,
    folderId: existing.folderId,
    isPrivate: existing.isPrivate,
    tags: existing.tags.map((t) => t.name),
  });

  return dup;
}

export async function idbEmptyTrash(): Promise<{ count: number }> {
  let count = 0;
  const db = await openDB();
  const transaction = db.transaction(["notes", "history"], "readwrite");
  const noteStore = transaction.objectStore("notes");
  const historyStore = transaction.objectStore("history");

  const allNotes = await reqToPromise<NoteDto[]>(noteStore.getAll());
  const deletedNotes = allNotes.filter((n) => n.isDeleted);

  for (const note of deletedNotes) {
    noteStore.delete(note.id);
    count++;
    // delete history
    const historyIdx = historyStore.index("noteId");
    const keys = await reqToPromise<IDBValidKey[]>(historyIdx.getAllKeys(note.id));
    for (const k of keys) historyStore.delete(k);
  }

  return { count };
}

export async function idbBulkNotesAction(input: {
  action: "pin" | "unpin" | "move" | "tag" | "trash" | "restore" | "delete";
  noteIds: string[];
  folderId?: string | null;
  tagNames?: string[];
}): Promise<{ count: number }> {
  for (const id of input.noteIds) {
    switch (input.action) {
      case "pin":
        await idbUpdateNote(id, { isPinned: true });
        break;
      case "unpin":
        await idbUpdateNote(id, { isPinned: false });
        break;
      case "move":
        await idbUpdateNote(id, { folderId: input.folderId });
        break;
      case "tag":
        if (input.tagNames) await idbUpdateNote(id, { tags: input.tagNames });
        break;
      case "trash":
        await idbDeleteNote(id);
        break;
      case "restore":
        await idbRestoreNote(id);
        break;
      case "delete":
        await idbPermanentDeleteNote(id);
        break;
    }
  }
  return { count: input.noteIds.length };
}

// ---------------- FOLDERS API ----------------

export async function idbGetFolders(): Promise<FolderDto[]> {
  const db = await openDB();
  const transaction = db.transaction(["folders", "notes"], "readonly");
  const folderStore = transaction.objectStore("folders");
  const noteStore = transaction.objectStore("notes");

  const folders = await reqToPromise<any[]>(folderStore.getAll());
  const notes = await reqToPromise<NoteDto[]>(noteStore.getAll());

  return folders
    .map((f) => {
      const activeCount = notes.filter((n) => n.folderId === f.id && !n.isDeleted).length;
      return {
        id: f.id,
        name: f.name,
        color: f.color || "blue",
        icon: f.icon || "folder",
        parentId: f.parentId || null,
        order: f.order || 0,
        noteCount: activeCount,
        createdAt: f.createdAt || new Date().toISOString(),
        updatedAt: f.updatedAt || new Date().toISOString(),
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function idbCreateFolder(input: {
  name: string;
  color?: NoteColor;
  parentId?: string;
}): Promise<FolderDto> {
  const now = new Date().toISOString();
  const folder: FolderDto = {
    id: uid(),
    name: input.name.trim(),
    color: input.color || "blue",
    icon: "folder",
    parentId: input.parentId || null,
    order: Date.now(),
    noteCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await tx("folders", "readwrite", (stores) => {
    return reqToPromise(stores.folders.put(folder));
  });

  return folder;
}

export async function idbUpdateFolder(
  id: string,
  input: { name?: string; color?: NoteColor; parentId?: string | null }
): Promise<FolderDto> {
  const now = new Date().toISOString();
  await tx("folders", "readwrite", async (stores) => {
    const existing = await reqToPromise<FolderDto>(stores.folders.get(id));
    if (!existing) throw new Error("Folder not found");

    const updated = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      color: input.color !== undefined ? input.color : existing.color,
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
      updatedAt: now,
    };
    await reqToPromise(stores.folders.put(updated));
  });

  const folders = await idbGetFolders();
  return folders.find((f) => f.id === id)!;
}

export async function idbDeleteFolder(
  id: string,
  mode: string = "trash",
  targetFolderId?: string
): Promise<{ ok: boolean }> {
  await tx(["folders", "notes"], "readwrite", async (stores) => {
    await reqToPromise(stores.folders.delete(id));

    const notes = await reqToPromise<NoteDto[]>(stores.notes.getAll());
    const childNotes = notes.filter((n) => n.folderId === id);

    for (const n of childNotes) {
      if (mode === "delete") {
        await reqToPromise(stores.notes.delete(n.id));
      } else if (mode === "move" && targetFolderId) {
        n.folderId = targetFolderId;
        await reqToPromise(stores.notes.put(n));
      } else {
        // default trash
        n.isDeleted = true;
        n.deletedAt = new Date().toISOString();
        await reqToPromise(stores.notes.put(n));
      }
    }
  });

  return { ok: true };
}

// ---------------- TAGS API ----------------

export async function idbGetTags(): Promise<TagDto[]> {
  const db = await openDB();
  const transaction = db.transaction(["tags", "notes"], "readonly");
  const tagStore = transaction.objectStore("tags");
  const noteStore = transaction.objectStore("notes");

  const tags = await reqToPromise<any[]>(tagStore.getAll());
  const notes = await reqToPromise<NoteDto[]>(noteStore.getAll());

  return tags
    .map((t) => {
      const activeCount = notes.filter((n) => !n.isDeleted && n.tags.some((nt) => nt.id === t.id)).length;
      return {
        id: t.id,
        name: t.name,
        color: t.color || "default",
        order: t.order || 0,
        noteCount: activeCount,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function idbCreateTag(input: { name: string; color?: NoteColor }): Promise<TagDto> {
  const cleanName = input.name.trim().replace(/^#/, "");
  if (!cleanName) throw new Error("Tag name required");

  const tag: TagDto = {
    id: uid(),
    name: cleanName,
    color: input.color || "default",
    order: Date.now(),
    noteCount: 0,
  };

  await tx("tags", "readwrite", (stores) => {
    return reqToPromise(stores.tags.put(tag));
  });

  return tag;
}

export async function idbUpdateTag(id: string, input: { name?: string; color?: NoteColor }): Promise<TagDto> {
  await tx(["tags", "notes"], "readwrite", async (stores) => {
    const existing = await reqToPromise<TagDto>(stores.tags.get(id));
    if (!existing) throw new Error("Tag not found");

    const newName = input.name !== undefined ? input.name.trim().replace(/^#/, "") : existing.name;
    const newColor = input.color !== undefined ? input.color : existing.color;

    const updated = { ...existing, name: newName, color: newColor };
    await reqToPromise(stores.tags.put(updated));

    // Update tag references inside notes
    const notes = await reqToPromise<NoteDto[]>(stores.notes.getAll());
    for (const n of notes) {
      if (n.tags.some((t) => t.id === id)) {
        n.tags = n.tags.map((t) => (t.id === id ? { id, name: newName, color: newColor } : t));
        await reqToPromise(stores.notes.put(n));
      }
    }
  });

  const tags = await idbGetTags();
  return tags.find((t) => t.id === id)!;
}

export async function idbDeleteTag(id: string): Promise<{ ok: boolean }> {
  await tx(["tags", "notes"], "readwrite", async (stores) => {
    await reqToPromise(stores.tags.delete(id));

    // Remove tag references from notes
    const notes = await reqToPromise<NoteDto[]>(stores.notes.getAll());
    for (const n of notes) {
      if (n.tags.some((t) => t.id === id)) {
        n.tags = n.tags.filter((t) => t.id !== id);
        await reqToPromise(stores.notes.put(n));
      }
    }
  });

  return { ok: true };
}

async function idbEnsureTags(tagNames: string[]): Promise<{ id: string; name: string; color: string }[]> {
  const db = await openDB();
  const transaction = db.transaction("tags", "readwrite");
  const tagStore = transaction.objectStore("tags");
  const existingTags = await reqToPromise<TagDto[]>(tagStore.getAll());

  const result: { id: string; name: string; color: string }[] = [];

  for (const name of tagNames) {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) continue;

    let found = existingTags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
    if (!found) {
      found = {
        id: uid(),
        name: clean,
        color: "default",
        order: Date.now(),
        noteCount: 0,
      };
      await reqToPromise(tagStore.put(found));
      existingTags.push(found);
    }
    result.push({ id: found.id, name: found.name, color: found.color });
  }

  return result;
}

// ---------------- STATS API ----------------

export async function idbGetStats() {
  const db = await openDB();
  const transaction = db.transaction(["notes", "folders", "tags"], "readonly");

  const notes = await reqToPromise<NoteDto[]>(transaction.objectStore("notes").getAll());
  const folders = await reqToPromise<FolderDto[]>(transaction.objectStore("folders").getAll());
  const tags = await reqToPromise<TagDto[]>(transaction.objectStore("tags").getAll());

  const activeNotes = notes.filter((n) => !n.isDeleted);
  const trashNotes = notes.filter((n) => n.isDeleted);

  let attachmentsCount = 0;
  let attachmentsBytes = 0;
  for (const n of activeNotes) {
    attachmentsCount += n.attachmentCount || 0;
    attachmentsBytes += n.attachmentsSize || 0;
  }

  return {
    notes: activeNotes.filter((n) => !n.isArchived).length,
    favorites: activeNotes.filter((n) => n.isFavorite).length,
    archived: activeNotes.filter((n) => n.isArchived).length,
    trash: trashNotes.length,
    notebooks: folders.length,
    folders: folders.length,
    tags: tags.length,
    private: activeNotes.filter((n) => n.isPrivate).length,
    privateNotes: activeNotes.filter((n) => n.isPrivate).length,
    attachments: attachmentsCount,
    attachmentsCount,
    attachmentsBytes,
    attachmentBytes: attachmentsBytes,
  };
}

// ---------------- SETTINGS API ----------------

export async function idbGetSettings(): Promise<AppSettings> {
  const db = await openDB();
  const transaction = db.transaction("settings", "readonly");
  const store = transaction.objectStore("settings");
  const record = await reqToPromise<any>(store.get("app_settings"));
  if (!record || !record.value) {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...record.value };
}

export async function idbUpdateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await idbGetSettings();
  const next = { ...current, ...partial };
  await tx("settings", "readwrite", (stores) => {
    return reqToPromise(stores.settings.put({ id: "app_settings", value: next }));
  });
  return next;
}

// ---------------- PRIVATESAFE API ----------------

export async function idbUnlockPrivateSafe(input: {
  pin?: string;
  pattern?: string;
  biometric?: boolean;
}): Promise<{ ok: boolean }> {
  const settings = await idbGetSettings();
  if (!settings.privateSafeEnabled) return { ok: true };

  if (input.pin && settings.privateSafePin) {
    if (localHash(input.pin) === settings.privateSafePin) return { ok: true };
    throw new Error("Invalid PIN");
  }

  if (input.pattern && settings.privateSafePattern) {
    if (localHash(input.pattern) === settings.privateSafePattern) return { ok: true };
    throw new Error("Invalid Pattern");
  }

  if (input.biometric && settings.privateSafeUseBiometric) {
    return { ok: true };
  }

  throw new Error("Authentication failed");
}

export async function idbVerifyPrivateSafe(input: {
  pin?: string;
  pattern?: string;
}): Promise<{ ok: boolean; method: string }> {
  const settings = await idbGetSettings();
  if (input.pin && settings.privateSafePin) {
    const match = localHash(input.pin) === settings.privateSafePin;
    if (match) return { ok: true, method: "pin" };
    throw new Error("PIN does not match");
  }
  if (input.pattern && settings.privateSafePattern) {
    const match = localHash(input.pattern) === settings.privateSafePattern;
    if (match) return { ok: true, method: "pattern" };
    throw new Error("Pattern does not match");
  }
  throw new Error("No authentication method set");
}

// ---------------- HISTORY API ----------------

export async function idbGetNoteHistory(noteId: string) {
  const db = await openDB();
  const transaction = db.transaction("history", "readonly");
  const store = transaction.objectStore("history");
  const index = store.index("noteId");

  const snapshots = await reqToPromise<any[]>(index.getAll(noteId));
  return snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function idbRestoreHistoryNote(noteId: string, historyId: string): Promise<NoteDto> {
  const db = await openDB();
  const transaction = db.transaction("history", "readonly");
  const snapshot = await reqToPromise<any>(transaction.objectStore("history").get(historyId));
  if (!snapshot) throw new Error("Snapshot not found");

  return idbUpdateNote(noteId, {
    title: snapshot.title,
    content: snapshot.content,
  });
}

// ---------------- INITIAL DEMO SEED ----------------

export async function idbSeedInitialData(force = false): Promise<{ seeded: boolean; count: number }> {
  // Demo/dummy note seeding disabled as requested by user
  return { seeded: false, count: 0 };
}

export async function idbClearDemoNotes(): Promise<{ cleared: boolean }> {
  const db = await openDB();
  const transaction = db.transaction(["notes", "folders", "tags", "history"], "readwrite");
  const noteStore = transaction.objectStore("notes");
  const folderStore = transaction.objectStore("folders");
  const tagStore = transaction.objectStore("tags");
  const historyStore = transaction.objectStore("history");

  const notes = await reqToPromise<NoteDto[]>(noteStore.getAll());
  const demoTitles = new Set([
    "Welcome to LS Notes",
    "Project Roadmap 2026",
    "Reading List",
    "Morning Pages",
    "Quick Snippet — Debounce",
  ]);

  for (const n of notes) {
    if (demoTitles.has(n.title)) {
      noteStore.delete(n.id);
      const historyIdx = historyStore.index("noteId");
      const keys = await reqToPromise<IDBValidKey[]>(historyIdx.getAllKeys(n.id));
      for (const k of keys) historyStore.delete(k);
    }
  }

  // Remove demo folders if empty
  const folders = await reqToPromise<FolderDto[]>(folderStore.getAll());
  const demoFolders = new Set(["Work", "Personal", "Ideas"]);
  for (const f of folders) {
    if (demoFolders.has(f.name)) {
      folderStore.delete(f.id);
    }
  }

  // Remove demo tags if empty
  const tags = await reqToPromise<TagDto[]>(tagStore.getAll());
  const demoTags = new Set(["important", "todo", "inspiration", "reference"]);
  for (const t of tags) {
    if (demoTags.has(t.name)) {
      tagStore.delete(t.id);
    }
  }

  return { cleared: true };
}
