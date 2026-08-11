// LS Notes — Tag by id: PUT (rename/merge/color) / DELETE
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, mapTag } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (body.name !== undefined) {
    const name = body.name.trim().replace(/^#/, "");
    if (!name) return fail("Tag name required");
    // merge if another tag with this name exists
    const existing = await db.tag.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      // move all noteTag links to existing tag
      const links = await db.noteTag.findMany({ where: { tagId: id } });
      for (const l of links) {
        await db.noteTag.upsert({
          where: { noteId_tagId: { noteId: l.noteId, tagId: existing.id } },
          create: { noteId: l.noteId, tagId: existing.id },
          update: {},
        });
      }
      await db.noteTag.deleteMany({ where: { tagId: id } });
      await db.tag.delete({ where: { id } });
      return ok({ merged: true, into: existing.id });
    }
    data.name = name;
  }
  if (body.color !== undefined) data.color = body.color;
  const tag = await db.tag.update({ where: { id }, data });
  return ok(mapTag(tag));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removing a tag removes it from notes but does not delete notes
  await db.noteTag.deleteMany({ where: { tagId: id } });
  await db.tag.delete({ where: { id } });
  return ok({ id, deleted: true });
}
