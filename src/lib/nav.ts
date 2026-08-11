// LS Notes — navigation sections config
import {
  StickyNote, Folder, Tag, Pin, Clock, Share2, Trash2, ShieldCheck, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SectionId =
  | "all"
  | "notebooks"
  | "tags"
  | "pinned"
  | "recent"
  | "shared"
  | "trash"
  | "private"
  | "settings";

export interface Section {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  primary?: boolean; // shown in bottom nav on mobile
  secondary?: boolean; // shown in drawer
}

export const PRIMARY_SECTIONS: Section[] = [
  { id: "all", label: "All Notes", icon: StickyNote, primary: true },
  { id: "notebooks", label: "Notebooks", icon: Folder, primary: true },
  { id: "tags", label: "Tags", icon: Tag, primary: true },
  { id: "pinned", label: "Pinned", icon: Pin, primary: true },
  { id: "recent", label: "Recent", icon: Clock, primary: true },
];

export const SECONDARY_SECTIONS: Section[] = [
  { id: "shared", label: "Shared / Exported", icon: Share2, secondary: true },
  { id: "private", label: "PrivateSafe", icon: ShieldCheck, secondary: true },
  { id: "trash", label: "Trash", icon: Trash2, secondary: true },
  { id: "settings", label: "Settings", icon: Settings, secondary: true },
];

export const ALL_SECTIONS: Section[] = [...PRIMARY_SECTIONS, ...SECONDARY_SECTIONS];
