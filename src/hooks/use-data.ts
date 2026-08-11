"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentBlock, NoteType, NoteColor, FolderDto, TagDto, NoteDto } from "@/lib/types";

// ---------- Notes ----------
async function fetchNotes(params: Record<string, string | undefined>): Promise<NoteDto[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const res = await fetch(`/api/notes?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export function useNotes(scope: string = "all", extra?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["notes", scope, extra],
    queryFn: () => fetchNotes({ scope, ...extra }),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) return null;
      return res.json() as Promise<NoteDto>;
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
  folderId?: string;
  isPrivate?: boolean;
  tags?: string[];
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json() as Promise<NoteDto>;
    },
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
    mutationFn: async ({ id, ...input }: UpdateNoteInput & { id: string }) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json() as Promise<NoteDto>;
    },
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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore note");
      return res.json();
    },
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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}/permanent`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to permanently delete note");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDuplicateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to duplicate note");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trash/empty", { method: "POST" });
      if (!res.ok) throw new Error("Failed to empty trash");
      return res.json();
    },
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
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: NoteColor; parentId?: string }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; color?: NoteColor; parentId?: string | null }) => {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update folder");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, targetFolderId }: { id: string; mode?: string; targetFolderId?: string }) => {
      const qs = new URLSearchParams({ mode: mode || "trash" });
      if (targetFolderId) qs.set("targetFolderId", targetFolderId);
      const res = await fetch(`/api/folders/${id}?${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete folder");
      return res.json();
    },
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
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: NoteColor }) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; color?: NoteColor }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update tag");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tag");
      return res.json();
    },
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
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) return null;
      return res.json();
    },
  });
}

// ---------- PrivateSafe ----------
export function useUnlockPrivateSafe() {
  return useMutation({
    mutationFn: async (input: { pin?: string; pattern?: string; biometric?: boolean }) => {
      const res = await fetch("/api/privatesafe/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      return data;
    },
  });
}

export function useVerifyPrivateSafe() {
  return useMutation({
    mutationFn: async (input: { pin?: string; pattern?: string }) => {
      const res = await fetch("/api/privatesafe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      return data as { ok: boolean; method: string };
    },
  });
}
