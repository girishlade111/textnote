// LS Notes — shared API helpers (server-side)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBlocks, blocksToExcerpt, countWords, countChars, serializeBlocks } from "@/lib/notes";
import type { ContentBlock, NoteDto, FolderDto, TagDto, NoteColor } from "@/lib/types";

export function ok(data: unknown) {
  return NextResponse.json(data);
}
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function mapNote(n: any): Promise<NoteDto> {
  const blocks = parseBlocks(n.content);
  const folder = n.folder;
  return {
    id: n.id,
    title: n.title,
    content: blocks,
    excerpt: n.excerpt || blocksToExcerpt(blocks),
    type: n.type,
    color: n.color as NoteColor,
    folderId: n.folderId,
    folderName: folder?.name ?? null,
    isPinned: n.isPinned,
    isFavorite: n.isFavorite,
    isPrivate: n.isPrivate,
    isArchived: n.isArchived,
    isDeleted: n.isDeleted,
    deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
    deletedFromId: n.deletedFromId,
    wordCount: n.wordCount,
    charCount: n.charCount,
    attachmentsSize: n.attachmentsSize ?? 0,
    tags: (n.tags || []).map((t: any) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })),
    attachmentCount: n.attachments?.length ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    order: n.order,
  };
}

export function mapFolder(f: any): FolderDto {
  return {
    id: f.id,
    name: f.name,
    color: f.color,
    icon: f.icon,
    parentId: f.parentId,
    order: f.order,
    noteCount: f.noteCount ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export function mapTag(t: any): TagDto {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    order: t.order ?? 0,
    noteCount: t.notes?.length ?? 0,
  };
}

// Recompute derived fields from content blocks and persist
export function deriveFromBlocks(blocks: ContentBlock[]) {
  return {
    excerpt: blocksToExcerpt(blocks),
    wordCount: countWords(blocks),
    charCount: countChars(blocks),
    content: serializeBlocks(blocks),
  };
}

export async function setNoteTags(noteId: string, tagNames: string[]) {
  await db.noteTag.deleteMany({ where: { noteId } });
  for (const name of tagNames) {
    const clean = name.trim().replace(/^#/, "");
    if (!clean) continue;
    let tag = await db.tag.findUnique({ where: { name: clean } });
    if (!tag) {
      tag = await db.tag.create({ data: { name: clean, color: "default" } });
    }
    await db.noteTag.upsert({
      where: { noteId_tagId: { noteId, tagId: tag.id } },
      create: { noteId, tagId: tag.id },
      update: {},
    });
  }
}

export async function recomputeFolderCount(folderId: string | null) {
  if (!folderId) return;
  const count = await db.note.count({
    where: { folderId, isDeleted: false },
  });
  await db.folder.update({ where: { id: folderId }, data: { noteCount: count } });
}
