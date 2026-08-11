// LS Notes — Folder by id: PUT / DELETE
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, mapFolder, recomputeFolderCount } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.color !== undefined) data.color = body.color;
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;
  if (body.order !== undefined) data.order = body.order;
  const folder = await db.folder.update({ where: { id }, data });
  return ok(mapFolder(folder));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "trash"; // trash | moveAll | allNotes
  const targetFolderId = searchParams.get("targetFolderId");

  const folder = await db.folder.findUnique({ where: { id } });
  if (!folder) return fail("Folder not found", 404);

  if (mode === "moveAll" && targetFolderId) {
    await db.note.updateMany({ where: { folderId: id, isDeleted: false }, data: { folderId: targetFolderId } });
    await recomputeFolderCount(targetFolderId);
  } else if (mode === "allNotes") {
    await db.note.updateMany({ where: { folderId: id, isDeleted: false }, data: { folderId: null } });
  } else {
    // trash: move notes to trash
    await db.note.updateMany({
      where: { folderId: id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date(), deletedFromId: id, folderId: null },
    });
  }
  // re-parent children to parent
  await db.folder.updateMany({ where: { parentId: id }, data: { parentId: folder.parentId } });
  await db.folder.delete({ where: { id } });
  return ok({ id, deleted: true, mode });
}
