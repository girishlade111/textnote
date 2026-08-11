// LS Notes — permanently delete a note
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, recomputeFolderCount } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await db.note.findUnique({ where: { id } });
  if (!note) return fail("Note not found", 404);
  await db.note.delete({ where: { id } });
  await recomputeFolderCount(note.folderId);
  return ok({ id, permanentlyDeleted: true });
}
