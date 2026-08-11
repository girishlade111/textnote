// LS Notes — shared types for content blocks, notes, folders, tags, settings

export type NoteType =
  | "text"
  | "checklist"
  | "photo"
  | "audio"
  | "sketch"
  | "file"
  | "smart"
  | "bookmark"
  | "code"
  | "table"
  | "scan";

export type NoteColor =
  | "default"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "pink"
  | "rose"
  | "brown"
  | "grey";

export type BlockType =
  | "text"
  | "heading"
  | "quote"
  | "code"
  | "divider"
  | "checklist"
  | "bullet"
  | "numbered"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "drawing"
  | "table"
  | "link"
  | "smart"
  | "bookmark"
  | "toc";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  text: string;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  highlight?: string;
  marks?: TextMark[];
}

export interface TextMark {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level: 1 | 2 | 3;
  align?: "left" | "center" | "right" | "justify";
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  code: string;
  language?: string;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  indent?: number;
}

export interface ChecklistBlock extends BaseBlock {
  type: "checklist";
  items: ChecklistItem[];
}

export interface ListBlock extends BaseBlock {
  type: "bullet" | "numbered";
  items: { id: string; text: string; indent?: number }[];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string; // data URL or attachment id
  name?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface AudioBlock extends BaseBlock {
  type: "audio";
  src: string;
  name?: string;
  duration?: number;
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  src: string;
  name?: string;
}

export interface FileBlock extends BaseBlock {
  type: "file";
  src: string;
  name: string;
  size: number;
  mime: string;
}

export interface DrawingBlock extends BaseBlock {
  type: "drawing";
  // SVG path data or data URL of PNG
  dataUrl: string;
  name?: string;
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: string[][];
  header?: boolean;
}

export interface LinkBlock extends BaseBlock {
  type: "link";
  url: string;
  title?: string;
  description?: string;
}

export interface SmartBlock extends BaseBlock {
  type: "smart";
  url?: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  cover?: string;
  labels?: string[];
  kind?: "web" | "video" | "article" | "recipe" | "bookmark" | "location" | "contact" | "snippet";
}

export interface BookmarkBlock extends BaseBlock {
  type: "bookmark";
  url: string;
  title: string;
  description?: string;
  cover?: string;
  tags?: string[];
}

export interface TocBlock extends BaseBlock {
  type: "toc";
  title?: string;
}

export type ContentBlock =
  | TextBlock
  | HeadingBlock
  | QuoteBlock
  | CodeBlock
  | DividerBlock
  | ChecklistBlock
  | ListBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | FileBlock
  | DrawingBlock
  | TableBlock
  | LinkBlock
  | SmartBlock
  | BookmarkBlock
  | TocBlock;

export interface NoteDto {
  id: string;
  title: string;
  content: ContentBlock[];
  excerpt: string;
  type: NoteType;
  color: NoteColor;
  folderId: string | null;
  folderName?: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedFromId: string | null;
  wordCount: number;
  charCount: number;
  attachmentsSize: number;
  tags: { id: string; name: string; color: string }[];
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface FolderDto {
  id: string;
  name: string;
  color: NoteColor;
  icon: string;
  parentId: string | null;
  order: number;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagDto {
  id: string;
  name: string;
  color: NoteColor;
  order: number;
  noteCount: number;
}

export type ThemeMode = "light" | "dark" | "system";
export type DefaultNoteColorMode = "random" | "theme" | "choose";
export type NoteViewMode = "grid" | "list";
export type EditorMode = "basic" | "advanced";
export type ShowTimeMode = "created" | "edited" | "both" | "hidden";
export type AutoLockMode = "immediate" | "30s" | "1m" | "5m" | "background";

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: string;
  defaultNoteColorMode: DefaultNoteColorMode;
  defaultNoteColor: NoteColor;
  showTime: ShowTimeMode;
  defaultView: NoteViewMode;
  defaultEditor: EditorMode;
  editorFont: string;
  editorFontSize: number; // px
  spellCheck: boolean;
  checklistMoveCompletedToBottom: boolean;
  checklistHideCompleted: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  trashRetentionDays: number;
  privateSafeEnabled: boolean;
  privateSafePin: string | null; // hashed
  privateSafeUsePin: boolean;
  privateSafeUseBiometric: boolean;
  privateSafeUsePattern: boolean;
  privateSafePattern: string | null; // hashed
  privateSafeAutoLock: AutoLockMode;
  searchIncludePrivate: boolean;
  exportIncludeMetadata: boolean;
  exportIncludeAttachments: boolean;
  hapticFeedback: boolean;
  animations: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: "system",
  accentColor: "emerald",
  defaultNoteColorMode: "random",
  defaultNoteColor: "default",
  showTime: "edited",
  defaultView: "grid",
  defaultEditor: "basic",
  editorFont: "Raleway",
  editorFontSize: 16,
  spellCheck: true,
  checklistMoveCompletedToBottom: true,
  checklistHideCompleted: false,
  autoSave: true,
  autoSaveInterval: 3,
  trashRetentionDays: 30,
  privateSafeEnabled: false,
  privateSafePin: null,
  privateSafeUsePin: true,
  privateSafeUseBiometric: false,
  privateSafeUsePattern: false,
  privateSafePattern: null,
  privateSafeAutoLock: "immediate",
  searchIncludePrivate: false,
  exportIncludeMetadata: true,
  exportIncludeAttachments: true,
  hapticFeedback: true,
  animations: true,
};

export const FONT_OPTIONS = [
  "Raleway",
  "Roboto",
  "Ruda",
  "Ubuntu",
  "Zilla Slab",
  "Sans-serif",
  "Serif",
  "Monospace",
  "Inter",
  "Poppins",
  "Lora",
  "Playfair Display",
  "JetBrains Mono",
];

export const FONT_SIZE_PRESETS = [
  { label: "Small", value: 13 },
  { label: "Default", value: 16 },
  { label: "Medium", value: 18 },
  { label: "Large", value: 21 },
  { label: "Extra Large", value: 24 },
];

export const NOTE_COLORS: { id: NoteColor; label: string; hex: string; light: string; dark: string }[] = [
  { id: "default", label: "Default", hex: "#9ca3af", light: "#ffffff", dark: "#1f1f23" },
  { id: "red", label: "Red", hex: "#ef4444", light: "#fee2e2", dark: "#4c1d1d" },
  { id: "orange", label: "Orange", hex: "#f97316", light: "#ffedd5", dark: "#431407" },
  { id: "amber", label: "Amber", hex: "#f59e0b", light: "#fef3c7", dark: "#451a03" },
  { id: "yellow", label: "Yellow", hex: "#eab308", light: "#fef9c3", dark: "#422006" },
  { id: "lime", label: "Lime", hex: "#84cc16", light: "#ecfccb", dark: "#1a2e05" },
  { id: "green", label: "Green", hex: "#22c55e", light: "#dcfce7", dark: "#052e16" },
  { id: "teal", label: "Teal", hex: "#14b8a6", light: "#ccfbf1", dark: "#042f2e" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", light: "#cffafe", dark: "#083344" },
  { id: "blue", label: "Blue", hex: "#3b82f6", light: "#dbeafe", dark: "#172554" },
  { id: "indigo", label: "Indigo", hex: "#6366f1", light: "#e0e7ff", dark: "#1e1b4b" },
  { id: "violet", label: "Violet", hex: "#8b5cf6", light: "#ede9fe", dark: "#2e1065" },
  { id: "purple", label: "Purple", hex: "#a855f7", light: "#f3e8ff", dark: "#3b0764" },
  { id: "pink", label: "Pink", hex: "#ec4899", light: "#fce7f3", dark: "#500724" },
  { id: "rose", label: "Rose", hex: "#f43f5e", light: "#ffe4e6", dark: "#4c0519" },
  { id: "brown", label: "Brown", hex: "#a16207", light: "#fef0c7", dark: "#2a1607" },
  { id: "grey", label: "Grey", hex: "#6b7280", light: "#f3f4f6", dark: "#1f2937" },
];

export function colorHex(id: NoteColor): string {
  return NOTE_COLORS.find((c) => c.id === id)?.hex ?? "#9ca3af";
}
export function colorBg(id: NoteColor, dark: boolean): string {
  const c = NOTE_COLORS.find((x) => x.id === id);
  if (!c || id === "default") return dark ? "#1f1f23" : "#ffffff";
  return dark ? c.dark : c.light;
}
