// LS Notes — Bulk note operations: POST /api/notes/bulk
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, recomputeFolderCount, setNoteTags } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, noteIds, folderId, tagNames } = body;

  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return fail("noteIds must be a non-empty array", 400);
  }

  if (!action) return fail("action is required", 400);

  switch (action) {
    case "pin": {
      await db.note.updateMany({
        where: { id: { in: noteIds } },
        data: { isPinned: true },
      });
      break;
    }

    case "unpin": {
      await db.note.updateMany({
        where: { id: { in: noteIds } },
        data: { isPinned: false },
      });
      break;
    }

    case "move": {
      const targetFolderId = folderId || null;
      // Fetch affected notes to recompute folder counts
      const notesBefore = await db.note.findMany({
        where: { id: { in: noteIds } },
        select: { folderId: true },
      });
      const oldFolderIds = Array.from(new Set(notesBefore.map((n) => n.folderId).filter(Boolean))) as string[];

      await db.note.updateMany({
        where: { id: { in: noteIds } },
        data: { folderId: targetFolderId },
      });

      // Recompute folder counts for all old folders and target folder
      for (const fid of oldFolderIds) {
        await recomputeFolderCount(fid);
      }
      if (targetFolderId) {
        await recomputeFolderCount(targetFolderId);
      }
      break;
    }

    case "tag": {
      if (Array.isArray(tagNames)) {
        for (const id of noteIds) {
          await setNoteTags(id, tagNames);
        }
      }
      break;
    }

    case "trash": {
      const notesBefore = await db.note.findMany({
        where: { id: { in: noteIds } },
        select: { folderId: true },
      });
      const oldFolderIds = Array.from(new Set(notesBefore.map((n) => n.folderId).filter(Boolean))) as string[];

      await db.note.updateMany({
        where: { id: { in: noteIds } },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isPinned: false,
        },
      });

      for (const fid of oldFolderIds) {
        await recomputeFolderCount(fid);
      }
      break;
    }

    case "restore": {
      await db.note.updateMany({
        where: { id: { in: noteIds } },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
      break;
    }

    case "delete": {
      await db.note.deleteMany({
        where: { id: { in: noteIds } },
      });
      break;
    }

    default:
      return fail(`Unsupported action: ${action}`, 400);
  }

  return ok({ success: true, count: noteIds.length, action });
}
