// LS Notes — local export helpers (MD, HTML, TXT, JSON, PDF-via-print)
import type { ContentBlock, NoteDto } from "@/lib/types";
import { blocksToPlainText, checklistProgress, formatDateTime } from "@/lib/notes";

export function blocksToMarkdown(blocks: ContentBlock[], level = 0): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        lines.push(`${"#".repeat(b.level || 2)} ${b.text}`);
        lines.push("");
        break;
      case "text":
        lines.push(applyInlineMarks(b.text, b.marks || []));
        lines.push("");
        break;
      case "quote":
        b.text.split("\n").forEach((l) => lines.push(`> ${l}`));
        lines.push("");
        break;
      case "code":
        lines.push("```" + (b.language || ""));
        lines.push(b.code);
        lines.push("```");
        lines.push("");
        break;
      case "divider":
        lines.push("---");
        lines.push("");
        break;
      case "checklist":
        b.items.forEach((i) => {
          const indent = "  ".repeat(i.indent || 0);
          lines.push(`${indent}- [${i.checked ? "x" : " "}] ${i.text}`);
        });
        lines.push("");
        break;
      case "bullet":
        b.items.forEach((i) => {
          const indent = "  ".repeat(i.indent || 0);
          lines.push(`${indent}- ${i.text}`);
        });
        lines.push("");
        break;
      case "numbered":
        b.items.forEach((i, idx) => {
          const indent = "  ".repeat(i.indent || 0);
          lines.push(`${indent}${idx + 1}. ${i.text}`);
        });
        lines.push("");
        break;
      case "image":
        lines.push(`![${b.name || "image"}](${b.src})`);
        if (b.caption) lines.push(`*${b.caption}*`);
        lines.push("");
        break;
      case "audio":
        lines.push(`[Audio: ${b.name || "recording"}]`);
        lines.push("");
        break;
      case "video":
        lines.push(`[Video: ${b.name || "video"}]`);
        lines.push("");
        break;
      case "file":
        lines.push(`[File: ${b.name}]`);
        lines.push("");
        break;
      case "drawing":
        lines.push(`![Drawing](${b.dataUrl})`);
        lines.push("");
        break;
      case "table":
        if (b.rows.length) {
          if (b.header) {
            lines.push(`| ${b.rows[0].join(" | ")} |`);
            lines.push(`| ${b.rows[0].map(() => "---").join(" | ")} |`);
            b.rows.slice(1).forEach((r) => lines.push(`| ${r.join(" | ")} |`));
          } else {
            b.rows.forEach((r) => lines.push(`| ${r.join(" | ")} |`));
            lines.push(`| ${b.rows[0].map(() => "---").join(" | ")} |`);
          }
          lines.push("");
        }
        break;
      case "link":
        lines.push(`[${b.title || b.url}](${b.url})`);
        lines.push("");
        break;
      case "smart":
        lines.push(`### ${b.title}`);
        if (b.subtitle) lines.push(`*${b.subtitle}*`);
        if (b.description) lines.push(b.description);
        if (b.url) lines.push(`[Open](${b.url})`);
        lines.push("");
        break;
      case "bookmark":
        lines.push(`🔖 [${b.title}](${b.url})`);
        if (b.description) lines.push(b.description);
        lines.push("");
        break;
      case "toc":
        lines.push(`## ${b.title || "Contents"}`);
        lines.push("");
        break;
    }
  }
  return lines.join("\n");
}

function applyInlineMarks(text: string, marks: { start: number; end: number; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean; link?: string }[]): string {
  if (!marks.length) return text;
  // simple: wrap whole text based on dominant marks (markdown limitation)
  let out = text;
  const hasBold = marks.some((m) => m.bold);
  const hasItalic = marks.some((m) => m.italic);
  const hasStrike = marks.some((m) => m.strike);
  if (hasBold) out = `**${out}**`;
  if (hasItalic) out = `*${out}*`;
  if (hasStrike) out = `~~${out}~~`;
  return out;
}

export function blocksToHtml(blocks: ContentBlock[], opts?: { metadata?: boolean; note?: NoteDto }): string {
  const parts: string[] = [];
  if (opts?.note) {
    const n = opts.note;
    parts.push(`<h1>${escapeHtml(n.title || "Untitled")}</h1>`);
  }
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        parts.push(`<h${b.level || 2}>${escapeHtml(b.text)}</h${b.level || 2}>`);
        break;
      case "text":
        parts.push(`<p style="text-align:${b.align || "left"}">${escapeHtml(b.text)}</p>`);
        break;
      case "quote":
        parts.push(`<blockquote>${escapeHtml(b.text)}</blockquote>`);
        break;
      case "code":
        parts.push(`<pre><code>${escapeHtml(b.code)}</code></pre>`);
        break;
      case "divider":
        parts.push(`<hr/>`);
        break;
      case "checklist":
        parts.push(
          `<ul style="list-style:none">${b.items
            .map((i) => `<li><input type="checkbox" ${i.checked ? "checked" : ""} disabled/> ${escapeHtml(i.text)}</li>`)
            .join("")}</ul>`
        );
        break;
      case "bullet":
        parts.push(`<ul>${b.items.map((i) => `<li>${escapeHtml(i.text)}</li>`).join("")}</ul>`);
        break;
      case "numbered":
        parts.push(`<ol>${b.items.map((i) => `<li>${escapeHtml(i.text)}</li>`).join("")}</ol>`);
        break;
      case "image":
        parts.push(`<figure><img src="${b.src}" alt="${escapeHtml(b.name || "")}" style="max-width:100%"/>${b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : ""}</figure>`);
        break;
      case "audio":
        parts.push(`<audio controls src="${b.src}"></audio>`);
        break;
      case "video":
        parts.push(`<video controls src="${b.src}" style="max-width:100%"></video>`);
        break;
      case "file":
        parts.push(`<p>📎 ${escapeHtml(b.name)}</p>`);
        break;
      case "drawing":
        parts.push(`<img src="${b.dataUrl}" alt="drawing" style="max-width:100%"/>`);
        break;
      case "table":
        parts.push(
          `<table>${b.rows
            .map(
              (r, i) =>
                `<tr>${r.map((c) => (i === 0 && b.header ? `<th>${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`)).join("")}</tr>`
            )
            .join("")}</table>`
        );
        break;
      case "link":
        parts.push(`<p><a href="${b.url}">${escapeHtml(b.title || b.url)}</a></p>`);
        break;
      case "smart":
        parts.push(
          `<div class="smart-card" style="border:1px solid #ddd;border-radius:12px;padding:16px;margin:8px 0"><h3>${escapeHtml(b.title)}</h3>${b.subtitle ? `<p><em>${escapeHtml(b.subtitle)}</em></p>` : ""}${b.description ? `<p>${escapeHtml(b.description)}</p>` : ""}${b.url ? `<a href="${b.url}">Open</a>` : ""}</div>`
        );
        break;
      case "bookmark":
        parts.push(`<div class="bookmark"><h3>🔖 ${escapeHtml(b.title)}</h3><a href="${b.url}">${escapeHtml(b.url)}</a>${b.description ? `<p>${escapeHtml(b.description)}</p>` : ""}</div>`);
        break;
      case "toc":
        parts.push(`<h2>${escapeHtml(b.title || "Contents")}</h2>`);
        break;
    }
  }
  if (opts?.metadata && opts.note) {
    const n = opts.note;
    parts.push(
      `<hr/><div class="metadata" style="color:#666;font-size:0.85em"><p>Created: ${formatDateTime(n.createdAt)}<br/>Modified: ${formatDateTime(n.updatedAt)}<br/>Tags: ${n.tags.map((t) => t.name).join(", ") || "—"}<br/>Words: ${n.wordCount} · Characters: ${n.charCount}</p></div>`
    );
  }
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(opts?.note?.title || "LS Notes")}</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.6;color:#1a1a1a}img{border-radius:8px}blockquote{border-left:3px solid #10b981;padding-left:12px;color:#555}pre{background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto}table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px}</style></head><body>${parts.join("\n")}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function noteToText(note: NoteDto): string {
  const header = `${note.title || "Untitled"}\n${"=".repeat(note.title?.length || 9)}\n\n`;
  return header + blocksToPlainText(note.content) + `\n\n— LS Notes · ${formatDateTime(note.updatedAt)}`;
}

export function noteToMarkdown(note: NoteDto, includeMeta = true): string {
  let md = `# ${note.title || "Untitled"}\n\n`;
  if (includeMeta) {
    md += `> Created: ${formatDateTime(note.createdAt)} · Modified: ${formatDateTime(note.updatedAt)}${note.tags.length ? ` · Tags: ${note.tags.map((t) => t.name).join(", ")}` : ""}\n\n`;
  }
  md += blocksToMarkdown(note.content);
  return md;
}

export function noteToExportFilename(note: NoteDto, ext: string): string {
  const safe = (note.title || "Untitled")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `LS_Notes_${safe}_${date}.${ext}`;
}

// Open a print window for PDF export
export function exportNoteAsPdf(note: NoteDto, includeMeta = true) {
  const html = blocksToHtml(note.content, { metadata: includeMeta, note });
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    alert("Please allow pop-ups to export as PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}

export function exportNotesAsJson(notes: NoteDto[]): string {
  return JSON.stringify(
    {
      app: "LS Notes",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: notes.length,
      notes: notes.map((n) => ({
        title: n.title,
        type: n.type,
        color: n.color,
        folder: n.folderName,
        tags: n.tags.map((t) => t.name),
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    },
    null,
    2
  );
}

// Parse imported JSON backup file
export function parseImportJson(text: string): { notes: any[]; error?: string } {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return { notes: data };
    if (data.notes && Array.isArray(data.notes)) return { notes: data.notes };
    return { notes: [], error: "No notes found in JSON" };
  } catch (e: any) {
    return { notes: [], error: e.message };
  }
}

// Parse imported Markdown to content blocks
export function parseMarkdown(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ id: Math.random().toString(36).slice(2), type: "text", text: para.join("\n"), align: "left", marks: [] });
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    // code fence
    if (line.startsWith("```")) {
      flushPara();
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing
      blocks.push({ id: Math.random().toString(36).slice(2), type: "code", code: code.join("\n"), language: lang });
      continue;
    }
    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      blocks.push({ id: Math.random().toString(36).slice(2), type: "heading", text: h[2], level: Math.min(h[1].length, 3) as 1 | 2 | 3, align: "left" });
      i++;
      continue;
    }
    // divider
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      blocks.push({ id: Math.random().toString(36).slice(2), type: "divider" });
      i++;
      continue;
    }
    // checklist
    if (/^\s*-\s*\[[x ]\]\s+/.test(line)) {
      flushPara();
      const items: any[] = [];
      while (i < lines.length && /^\s*-\s*\[[x ]\]\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)-\s*\[([x ])\]\s+(.*)$/);
        if (m) {
          items.push({ id: Math.random().toString(36).slice(2), text: m[3], checked: m[2] === "x", indent: Math.floor(m[1].length / 2) });
        }
        i++;
      }
      blocks.push({ id: Math.random().toString(36).slice(2), type: "checklist", items });
      continue;
    }
    // bullet
    if (/^\s*-\s+/.test(line)) {
      flushPara();
      const items: any[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)-\s+(.*)$/);
        if (m) items.push({ id: Math.random().toString(36).slice(2), text: m[2], indent: Math.floor(m[1].length / 2) });
        i++;
      }
      blocks.push({ id: Math.random().toString(36).slice(2), type: "bullet", items });
      continue;
    }
    // numbered
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items: any[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)$/);
        if (m) items.push({ id: Math.random().toString(36).slice(2), text: m[2], indent: Math.floor(m[1].length / 2) });
        i++;
      }
      blocks.push({ id: Math.random().toString(36).slice(2), type: "numbered", items });
      continue;
    }
    // quote
    if (line.startsWith(">")) {
      flushPara();
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        q.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ id: Math.random().toString(36).slice(2), type: "quote", text: q.join("\n") });
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();
  return blocks;
}
