// LS Notes — Empty trash
import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  const deleted = await db.note.deleteMany({ where: { isDeleted: true } });
  return ok({ emptied: true, count: deleted.count });
}
