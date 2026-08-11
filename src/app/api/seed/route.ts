// LS Notes — Seed demo notes on first run (local-only sample content)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";
import { serializeBlocks, blocksToExcerpt, countWords, countChars, uid } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const force = body.force === true;
  const existing = await db.note.count();
  if (existing > 0 && !force) return ok({ seeded: false, reason: "already has notes" });

  let now = Date.now();
  const samples: Array<any> = [
    {
      title: "Welcome to LS Notes",
      type: "text",
      color: "teal",
      isPinned: true,
      blocks: [
        { id: uid(), type: "heading", text: "Welcome to LS Notes", level: 1, align: "left" },
        { id: uid(), type: "text", text: "LS Notes is a premium, private, local-first note-taking app. Everything you create stays on your device — no accounts, no cloud, no tracking.", align: "left", marks: [] },
        { id: uid(), type: "heading", text: "What you can do", level: 2, align: "left" },
        { id: uid(), type: "bullet", items: [
          { id: uid(), text: "Capture ideas as text, checklists, photos, audio, sketches, and more", indent: 0 },
          { id: uid(), text: "Organize with notebooks, tags, colors, and pins", indent: 0 },
          { id: uid(), text: "Lock sensitive notes in PrivateSafe", indent: 0 },
          { id: uid(), text: "Import & export to Markdown, JSON, HTML, PDF", indent: 0 },
        ]},
        { id: uid(), type: "quote", text: "Privacy by design. Your words never leave your device." },
      ],
    },
    {
      title: "Project Roadmap 2026",
      type: "checklist",
      color: "violet",
      blocks: [
        { id: uid(), type: "heading", text: "Project Roadmap 2026", level: 1, align: "left" },
        { id: uid(), type: "checklist", items: [
          { id: uid(), text: "Define Q1 milestones", checked: true, indent: 0 },
          { id: uid(), text: "Finalize design system", checked: true, indent: 0 },
          { id: uid(), text: "Ship beta to early testers", checked: false, indent: 0 },
          { id: uid(), text: "Collect feedback and iterate", checked: false, indent: 0 },
          { id: uid(), text: "Launch v1.0", checked: false, indent: 0 },
        ]},
      ],
    },
    {
      title: "Reading List",
      type: "bookmark",
      color: "amber",
      blocks: [
        { id: uid(), type: "heading", text: "Reading List", level: 1, align: "left" },
        { id: uid(), type: "bookmark", url: "https://material.io/design", title: "Material Design 3", description: "Google's open-source design system for building beautiful, accessible products." },
        { id: uid(), type: "bookmark", url: "https://developer.mozilla.org", title: "MDN Web Docs", description: "Resources for developers, by developers." },
      ],
    },
    {
      title: "Morning Pages",
      type: "text",
      color: "rose",
      blocks: [
        { id: uid(), type: "heading", text: "Morning Pages", level: 1, align: "left" },
        { id: uid(), type: "text", text: "Today feels like a fresh start. Three pages of stream-of-consciousness writing to clear the mind and set intentions for the day ahead.", align: "left", marks: [{ start: 0, end: 5, bold: true }] },
      ],
    },
    {
      title: "Quick Snippet — Debounce",
      type: "code",
      color: "green",
      blocks: [
        { id: uid(), type: "heading", text: "Debounce helper", level: 2, align: "left" },
        { id: uid(), type: "code", code: "function debounce<T extends (...args: any[]) => void>(fn: T, ms = 300) {\n  let t: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n}", language: "typescript" },
      ],
    },
  ];

  for (const s of samples) {
    const blocks = s.blocks;
    await db.note.create({
      data: {
        title: s.title,
        type: s.type,
        color: s.color,
        isPinned: !!s.isPinned,
        content: serializeBlocks(blocks),
        excerpt: blocksToExcerpt(blocks),
        wordCount: countWords(blocks),
        charCount: countChars(blocks),
        order: now--,
      },
    });
  }

  // sample folders
  const folders = [
    { name: "Work", color: "blue" },
    { name: "Personal", color: "pink" },
    { name: "Ideas", color: "amber" },
  ];
  for (const f of folders) {
    await db.folder.create({ data: { name: f.name, color: f.color, noteCount: 0 } });
  }
  // sample tags
  for (const t of ["important", "todo", "inspiration", "reference"]) {
    await db.tag.create({ data: { name: t, color: "default" } });
  }

  return ok({ seeded: true, count: samples.length });
}
