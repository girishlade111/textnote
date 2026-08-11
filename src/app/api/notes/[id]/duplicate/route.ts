// LS Notes — duplicate a note
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, mapNote } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await db.note.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, attachments: true },
  });
  if (!note) return fail("Note not found", 404);

  const dup = await db.note.create({
    data: {
      title: note.title ? `${note.title} (copy)` : "Untitled (copy)",
      content: note.content,
      excerpt: note.excerpt,
      type: note.type,
      color: note.color,
      folderId: note.folderId,
      isPrivate: false, // never duplicate into private without auth
      isPinned: false,
      isFavorite: false,
      wordCount: note.wordCount,
      charCount: note.charCount,
      attachmentsSize: note.attachmentsSize,
    },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });

  // copy tags
  for (const nt of note.tags) {
    await db.noteTag.create({ data: { noteId: dup.id, tagId: nt.tagId } });
  }
  // copy attachments
  for (const a of note.attachments) {
    await db.attachment.create({
      data: {
        noteId: dup.id,
        name: a.name,
        mime: a.mime,
        size: a.size,
        dataUrl: a.dataUrl,
        kind: a.kind,
        width: a.width,
        height: a.height,
      },
    });
  }

  const fresh = await db.note.findUnique({
    where: { id: dup.id },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });
  return ok(await mapNote(fresh!));
}
