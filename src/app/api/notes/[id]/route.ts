// LS Notes — Note by id: GET / PUT / DELETE
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deriveFromBlocks, setNoteTags, mapNote, ok, fail, recomputeFolderCount } from "@/lib/api-helpers";
import type { ContentBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await db.note.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });
  if (!note) return fail("Note not found", 404);
  return ok(await mapNote(note));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await db.note.findUnique({ where: { id } });
  if (!existing) return fail("Note not found", 404);

  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) {
    const derived = deriveFromBlocks(body.content as ContentBlock[]);
    data.content = derived.content;
    data.excerpt = derived.excerpt;
    data.wordCount = derived.wordCount;
    data.charCount = derived.charCount;
  }
  if (body.color !== undefined) data.color = body.color;
  if (body.folderId !== undefined) data.folderId = body.folderId || null;
  if (body.isPinned !== undefined) data.isPinned = body.isPinned;
  if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;
  if (body.isPrivate !== undefined) data.isPrivate = body.isPrivate;
  if (body.isArchived !== undefined) data.isArchived = body.isArchived;
  if (body.type !== undefined) data.type = body.type;

  // Record note history snapshot if content or title changed
  if ((body.title !== undefined && body.title !== existing.title) || (body.content !== undefined && JSON.stringify(body.content) !== existing.content)) {
    const lastHistory = await db.noteHistory.findFirst({
      where: { noteId: id },
      orderBy: { createdAt: "desc" },
    });
    const now = Date.now();
    const lastTime = lastHistory ? new Date(lastHistory.createdAt).getTime() : 0;
    // Snapshot if no history exists or last snapshot was over 15 seconds ago
    if (!lastHistory || now - lastTime > 15000) {
      if (existing.title.trim() || existing.content !== "[]") {
        await db.noteHistory.create({
          data: {
            noteId: id,
            title: existing.title || "Untitled",
            content: existing.content,
          },
        });
      }
    }
  }

  const updated = await db.note.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });

  if (body.tags !== undefined) {
    await setNoteTags(id, body.tags);
  }

  // recompute folder counts
  if (body.folderId !== undefined) {
    await recomputeFolderCount(existing.folderId);
    await recomputeFolderCount(updated.folderId);
  }

  const fresh = await db.note.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });
  return ok(await mapNote(fresh!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await db.note.findUnique({ where: { id } });
  if (!note) return fail("Note not found", 404);

  // Move to trash (soft delete) unless permanent flag
  await db.note.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedFromId: note.folderId,
      isPinned: false,
    },
  });
  await recomputeFolderCount(note.folderId);
  return ok({ id, deleted: true });
}
