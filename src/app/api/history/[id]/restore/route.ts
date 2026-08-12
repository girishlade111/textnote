// LS Notes — Restore Note History Snapshot: POST /api/history/[id]/restore
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, deriveFromBlocks, mapNote } from "@/lib/api-helpers";
import type { ContentBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: noteId } = await params;
  const body = await req.json().catch(() => ({}));
  const { historyId } = body;

  if (!historyId) return fail("historyId is required", 400);

  const note = await db.note.findUnique({ where: { id: noteId } });
  if (!note) return fail("Note not found", 404);

  const history = await db.noteHistory.findUnique({ where: { id: historyId } });
  if (!history || history.noteId !== noteId) {
    return fail("History snapshot not found", 404);
  }

  // Create a snapshot of current state before restoring
  await db.noteHistory.create({
    data: {
      noteId,
      title: note.title,
      content: note.content,
    },
  });

  // Restore from snapshot
  let blocks: ContentBlock[] = [];
  try {
    blocks = JSON.parse(history.content || "[]");
  } catch {
    blocks = [];
  }

  const derived = deriveFromBlocks(blocks);

  const updated = await db.note.update({
    where: { id: noteId },
    data: {
      title: history.title,
      content: derived.content,
      excerpt: derived.excerpt,
      wordCount: derived.wordCount,
      charCount: derived.charCount,
    },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });

  return ok(await mapNote(updated));
}
