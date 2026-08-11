// LS Notes — Folders CRUD
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, mapFolder } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const folders = await db.folder.findMany({
    orderBy: { order: "asc" },
    include: { notes: { where: { isDeleted: false }, select: { id: true } } },
  });
  const out = folders.map((f) => ({
    ...mapFolder(f),
    noteCount: f.notes.length,
  }));
  return ok(out);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return fail("Folder name required");
  const count = await db.folder.count();
  const folder = await db.folder.create({
    data: {
      name: body.name.trim(),
      color: body.color || "default",
      icon: body.icon || "folder",
      parentId: body.parentId || null,
      order: body.order ?? count,
    },
  });
  return ok(mapFolder(folder));
}
