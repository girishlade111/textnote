"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentBlock, NoteType, NoteColor, FolderDto, TagDto, NoteDto } from "@/lib/types";
import {
  idbGetNotes,
  idbGetNote,
  idbCreateNote,
  idbUpdateNote,
  idbDeleteNote,
  idbRestoreNote,
  idbPermanentDeleteNote,
  idbDuplicateNote,
  idbEmptyTrash,
  idbGetFolders,
  idbCreateFolder,
  idbUpdateFolder,
  idbDeleteFolder,
  idbGetTags,
  idbCreateTag,
  idbUpdateTag,
  idbDeleteTag,
  idbGetStats,
  idbUnlockPrivateSafe,
  idbVerifyPrivateSafe,
  idbGetNoteHistory,
  idbRestoreHistoryNote,
  idbBulkNotesAction,
} from "@/lib/idb";

// ---------- Notes ----------
export function useNotes(scope: string = "all", extra?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["notes", scope, extra],
    queryFn: () => idbGetNotes({ scope, ...extra }),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      if (!id) return null;
      return idbGetNote(id);
    },
    enabled: !!id,
  });
}

interface CreateNoteInput {
  title?: string;
  content?: ContentBlock[];
  type?: NoteType;
  color?: NoteColor;
  colorMode?: string;
  folderId?: string | null;
  isPrivate?: boolean;
  tags?: string[];
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => idbCreateNote(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

interface UpdateNoteInput {
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

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateNoteInput & { id: string }) => idbUpdateNote(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", data.id] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => idbDeleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useRestoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => idbRestoreNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function usePermanentDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => idbPermanentDeleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDuplicateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => idbDuplicateNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => idbEmptyTrash(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ---------- Folders ----------
export function useFolders() {
  return useQuery<FolderDto[]>({
    queryKey: ["folders"],
    queryFn: () => idbGetFolders(),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: NoteColor; parentId?: string }) => idbCreateFolder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; color?: NoteColor; parentId?: string | null }) =>
      idbUpdateFolder(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode, targetFolderId }: { id: string; mode?: string; targetFolderId?: string }) =>
      idbDeleteFolder(id, mode, targetFolderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ---------- Tags ----------
export function useTags() {
  return useQuery<TagDto[]>({
    queryKey: ["tags"],
    queryFn: () => idbGetTags(),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: NoteColor }) => idbCreateTag(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; color?: NoteColor }) => idbUpdateTag(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => idbDeleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

// ---------- Stats ----------
export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => idbGetStats(),
  });
}

// ---------- PrivateSafe ----------
export function useUnlockPrivateSafe() {
  return useMutation({
    mutationFn: (input: { pin?: string; pattern?: string; biometric?: boolean }) => idbUnlockPrivateSafe(input),
  });
}

export function useVerifyPrivateSafe() {
  return useMutation({
    mutationFn: (input: { pin?: string; pattern?: string }) => idbVerifyPrivateSafe(input),
  });
}

// ---------- Note History ----------
export interface HistorySnapshotDto {
  id: string;
  title: string;
  content: ContentBlock[];
  createdAt: string;
}

export function useNoteHistory(noteId: string | null) {
  return useQuery({
    queryKey: ["history", noteId],
    queryFn: async () => {
      if (!noteId) return [];
      return idbGetNoteHistory(noteId);
    },
    enabled: !!noteId,
  });
}

export function useRestoreHistoryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, historyId }: { noteId: string; historyId: string }) =>
      idbRestoreHistoryNote(noteId, historyId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", data.id] });
      qc.invalidateQueries({ queryKey: ["history", data.id] });
    },
  });
}

// ---------- Bulk Note Actions ----------
export interface BulkActionInput {
  action: "pin" | "unpin" | "move" | "tag" | "trash" | "restore" | "delete";
  noteIds: string[];
  folderId?: string | null;
  tagNames?: string[];
}

export function useBulkNotesAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkActionInput) => idbBulkNotesAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
