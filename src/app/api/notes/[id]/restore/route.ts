// LS Notes — restore a note from trash
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, recomputeFolderCount } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await db.note.findUnique({ where: { id } });
  if (!note) return fail("Note not found", 404);

  // If restored-from folder no longer exists, restore to All Notes (null folder)
  let folderId = note.deletedFromId;
  if (folderId) {
    const folder = await db.folder.findUnique({ where: { id: folderId } });
    if (!folder) folderId = null;
  }
  await db.note.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null, deletedFromId: null, folderId },
  });
  await recomputeFolderCount(folderId);
  return ok({ id, restored: true, folderId });
}
