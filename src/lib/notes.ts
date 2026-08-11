// LS Notes — note content helpers: blocks, excerpt, counts, search
import type { ContentBlock, NoteColor } from "./types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function emptyBlock(type: ContentBlock["type"] = "text"): ContentBlock {
  const id = uid();
  switch (type) {
    case "text":
      return { id, type: "text", text: "", align: "left", marks: [] };
    case "heading":
      return { id, type: "heading", text: "", level: 2, align: "left" };
    case "quote":
      return { id, type: "quote", text: "" };
    case "code":
      return { id, type: "code", code: "", language: "text" };
    case "divider":
      return { id, type: "divider" };
    case "checklist":
      return { id, type: "checklist", items: [] };
    case "bullet":
      return { id, type: "bullet", items: [] };
    case "numbered":
      return { id, type: "numbered", items: [] };
    case "image":
      return { id, type: "image", src: "", name: "" };
    case "audio":
      return { id, type: "audio", src: "", name: "" };
    case "video":
      return { id, type: "video", src: "", name: "" };
    case "file":
      return { id, type: "file", src: "", name: "", size: 0, mime: "" };
    case "drawing":
      return { id, type: "drawing", dataUrl: "", name: "" };
    case "table":
      return { id, type: "table", rows: [["", ""]], header: true };
    case "link":
      return { id, type: "link", url: "", title: "" };
    case "smart":
      return { id, type: "smart", title: "", kind: "web" };
    case "bookmark":
      return { id, type: "bookmark", url: "", title: "" };
    case "toc":
      return { id, type: "toc", title: "Contents" };
    default:
      return { id, type: "text", text: "" };
  }
}

export function blocksToExcerpt(blocks: ContentBlock[], max = 160): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "text":
      case "heading":
      case "quote":
        if (b.text) parts.push(b.text);
        break;
      case "code":
        if (b.code) parts.push(b.code);
        break;
      case "checklist":
        b.items.forEach((i) => i.text && parts.push(i.text));
        break;
      case "bullet":
      case "numbered":
        b.items.forEach((i) => i.text && parts.push(i.text));
        break;
      case "link":
        if (b.title) parts.push(b.title);
        if (b.url) parts.push(b.url);
        break;
      case "smart":
      case "bookmark":
        if (b.title) parts.push(b.title);
        if ("description" in b && b.description) parts.push(b.description);
        break;
      case "table":
        b.rows.forEach((r) => parts.push(r.join(" ")));
        break;
      case "image":
      case "audio":
      case "video":
      case "file":
      case "drawing":
        if (b.name) parts.push(b.name);
        break;
    }
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocksToExcerpt(blocks, 100000);
}

export function countWords(blocks: ContentBlock[]): number {
  const text = blocksToPlainText(blocks);
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function countChars(blocks: ContentBlock[]): number {
  return blocksToPlainText(blocks).length;
}

export function checklistProgress(blocks: ContentBlock[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const b of blocks) {
    if (b.type === "checklist") {
      total += b.items.length;
      done += b.items.filter((i) => i.checked).length;
    }
  }
  return { done, total };
}

export function hasAttachment(blocks: ContentBlock[]): {
  images: number;
  audio: number;
  files: number;
  drawings: number;
} {
  let images = 0;
  let audio = 0;
  let files = 0;
  let drawings = 0;
  for (const b of blocks) {
    if (b.type === "image") images++;
    else if (b.type === "audio") audio++;
    else if (b.type === "file") files++;
    else if (b.type === "drawing") drawings++;
    else if (b.type === "video") files++;
  }
  return { images, audio, files, drawings };
}

export function extractLinks(blocks: ContentBlock[]): { url: string; title?: string }[] {
  const links: { url: string; title?: string }[] = [];
  const urlRe = /(https?:\/\/[^\s<>"']+)/g;
  for (const b of blocks) {
    if (b.type === "link" || b.type === "bookmark" || b.type === "smart") {
      if (b.url) links.push({ url: b.url, title: "title" in b ? b.title : undefined });
    }
    if (b.type === "text" || b.type === "heading" || b.type === "quote") {
      const matches = b.text.match(urlRe);
      if (matches) matches.forEach((m) => links.push({ url: m }));
      if (b.type === "text" && b.marks) {
        b.marks.forEach((m) => m.link && links.push({ url: m.link! }));
      }
    }
  }
  // dedupe by url
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

// Serialize / parse blocks (stored as JSON string in DB)
export function serializeBlocks(blocks: ContentBlock[]): string {
  return JSON.stringify(blocks);
}
export function parseBlocks(s: string | null | undefined): ContentBlock[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr as ContentBlock[];
  } catch {
    return [];
  }
}

// Simple deterministic hashing for local-only PIN/pattern (not crypto-strong,
// but local-only and never transmitted). Uses a salted FNV-1a variant.
export function localHash(input: string): string {
  const salt = "ls-notes-local-2026";
  let h = 0x811c9dc5;
  const str = salt + input;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // second pass
  let h2 = 0x84222325;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 ^= str.charCodeAt(i);
    h2 = Math.imul(h2, 0x00000193);
  }
  return (h >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

export function pickRandomColor(exclude?: NoteColor): NoteColor {
  const palette: NoteColor[] = [
    "red", "orange", "amber", "yellow", "lime", "green", "teal", "cyan",
    "blue", "violet", "purple", "pink", "rose", "brown", "grey",
  ];
  const pool = exclude ? palette.filter((c) => c !== exclude) : palette;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} wk ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  return `${Math.floor(day / 365)} yr ago`;
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function highlightMatch(text: string, query: string): { text: string; match: boolean }[] {
  if (!query.trim()) return [{ text, match: false }];
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + q.length), match: true },
    { text: text.slice(idx + q.length), match: false },
  ];
}
