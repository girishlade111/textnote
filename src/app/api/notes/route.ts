// LS Notes — Notes CRUD API
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deriveFromBlocks, setNoteTags, mapNote, ok, fail } from "@/lib/api-helpers";
import { parseBlocks, pickRandomColor } from "@/lib/notes";
import type { ContentBlock, NoteColor, NoteType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "all"; // all | pinned | recent | trash | private | shared
  const folderId = searchParams.get("folderId");
  const tagId = searchParams.get("tagId");
  const q = searchParams.get("q")?.trim();
  const limit = parseInt(searchParams.get("limit") || "0") || undefined;

  const where: any = {};
  if (scope === "trash") {
    where.isDeleted = true;
  } else {
    where.isDeleted = false;
    if (scope === "pinned") where.isPinned = true;
    if (scope === "private") where.isPrivate = true;
    if (scope === "shared") where.isArchived = true; // shared/exported bucket
    if (folderId) where.folderId = folderId;
    if (tagId) where.tags = { some: { tagId } };
  }

  let notes = await db.note.findMany({
    where,
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });

  if (q) {
    const ql = q.toLowerCase();
    notes = notes.filter((n) => {
      const blocks = parseBlocks(n.content);
      const text = (n.title + " " + (n.excerpt || "")).toLowerCase();
      if (text.includes(ql)) return true;
      const blockText = blocks
        .map((b: ContentBlock) => {
          if (b.type === "text" || b.type === "heading" || b.type === "quote") return b.text;
          if (b.type === "code") return b.code;
          if (b.type === "checklist") return b.items.map((i) => i.text).join(" ");
          if (b.type === "table") return b.rows.flat().join(" ");
          if (b.type === "link" || b.type === "smart" || b.type === "bookmark")
            return (b.title || "") + " " + (b.url || "");
          return "";
        })
        .join(" ")
        .toLowerCase();
      return blockText.includes(ql);
    });
  }

  const dtos = await Promise.all(notes.map(mapNote));
  return ok(dtos);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = (body.type as NoteType) || "text";
  const color =
    (body.color as NoteColor) ||
    (body.colorMode === "random" ? pickRandomColor() : body.colorMode === "theme" ? "default" : "default");
  const blocks: ContentBlock[] = body.content || (type === "checklist"
    ? [{ id: Math.random().toString(36).slice(2), type: "checklist", items: [] }]
    : [{ id: Math.random().toString(36).slice(2), type: "text", text: "", align: "left", marks: [] }]);
  const derived = deriveFromBlocks(blocks);
  const note = await db.note.create({
    data: {
      title: body.title || "",
      type,
      color,
      folderId: body.folderId || null,
      isPrivate: body.isPrivate || false,
      isPinned: body.isPinned || false,
      isFavorite: body.isFavorite || false,
      ...derived,
    },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });
  if (body.tags?.length) await setNoteTags(note.id, body.tags);
  const fresh = await db.note.findUnique({
    where: { id: note.id },
    include: { tags: { include: { tag: true } }, folder: true, attachments: true },
  });
  return ok(await mapNote(fresh!));
}
