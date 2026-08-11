// LS Notes — Note history (snapshots)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const history = await db.noteHistory.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return ok(
    history.map((h) => ({
      id: h.id,
      title: h.title,
      content: JSON.parse(h.content || "[]"),
      createdAt: h.createdAt.toISOString(),
    }))
  );
}
