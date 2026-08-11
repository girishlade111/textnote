// LS Notes — Auto-purge trash older than retention days
import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  const rows = await db.setting.findMany({ where: { key: "trashRetentionDays" } });
  const days = rows[0] ? Number(JSON.parse(rows[0].value)) : 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.note.deleteMany({ where: { isDeleted: true, deletedAt: { lt: cutoff } } });
  return ok({ purged: result.count, cutoff });
}
