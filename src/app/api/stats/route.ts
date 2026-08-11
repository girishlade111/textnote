// LS Notes — Stats (storage usage, counts)
import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const [notes, folders, tags, trash, attachments, privateNotes] = await Promise.all([
    db.note.count({ where: { isDeleted: false } }),
    db.folder.count(),
    db.tag.count(),
    db.note.count({ where: { isDeleted: true } }),
    db.attachment.aggregate({ _sum: { size: true }, _count: true }),
    db.note.count({ where: { isPrivate: true, isDeleted: false } }),
  ]);
  return ok({
    notes,
    folders,
    tags,
    trash,
    privateNotes,
    attachments: attachments._count,
    attachmentBytes: attachments._sum.size || 0,
  });
}
