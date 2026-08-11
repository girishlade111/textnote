// LS Notes — Tags CRUD
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, mapTag } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    include: { notes: { include: { note: { select: { id: true, isDeleted: true } } } } },
  });
  return ok(tags.map((t) => ({
    ...mapTag(t),
    noteCount: t.notes.filter((nt: any) => !nt.note?.isDeleted).length,
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim().replace(/^#/, "");
  if (!name) return fail("Tag name required");
  const existing = await db.tag.findUnique({ where: { name } });
  if (existing) return ok(mapTag(existing));
  const count = await db.tag.count();
  const tag = await db.tag.create({ data: { name, color: body.color || "default", order: count } });
  return ok(mapTag(tag));
}
