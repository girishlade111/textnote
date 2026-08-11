"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Palette, Sun, Moon, Monitor, Type, AlignLeft, CheckSquare, Save, Trash2,
  ShieldCheck, Lock, Fingerprint, Grid3x3, Search, HardDrive, Download, Upload,
  Info, Sparkles, Eye, Clock, Database, Vibrate, Zap, ChevronRight,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useSettingsStore } from "@/lib/stores";
import { FONT_OPTIONS, FONT_SIZE_PRESETS, NOTE_COLORS, DEFAULT_SETTINGS, type AppSettings, type ThemeMode, type NoteColor } from "@/lib/types";
import { colorHex } from "@/lib/types";
import { useStats } from "@/hooks/use-data";
import { useVerifyPrivateSafe } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import { parseImportJson, parseMarkdown, exportNotesAsJson } from "@/lib/export";
import { downloadFile } from "@/lib/ui-helpers";
import { useCreateNote } from "@/hooks/use-data";
import { formatFileSize } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const ACCENT_OPTIONS = ["emerald","teal","green","rose","pink","orange","amber","violet","purple","cyan"];

export function SettingsView() {
  const { settings, update, loaded } = useSettings();
  const { data: stats } = useStats();
  const [pinSetupOpen, setPinSetupOpen] = useState(false);

  if (!loaded) return <div className="space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="ls-skeleton rounded-2xl h-16" />)}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Appearance */}
      <Section icon={Palette} title="Appearance" desc="Theme, accent color, and note color defaults">
        <Row label="Theme">
          <div className="flex gap-1 p-1 rounded-full bg-muted">
            {([["light",Sun],["dark",Moon],["system",Monitor]] as const).map(([v,Icon]) => (
              <button key={v} onClick={() => update({ themeMode: v as ThemeMode })} className={cn("px-3 h-8 rounded-full text-xs font-medium inline-flex items-center gap-1.5", settings.themeMode === v ? "bg-background elev-1" : "text-muted-foreground")}>
                <Icon className="h-3.5 w-3.5" /> <span className="capitalize hidden sm:inline">{v}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label="Accent color">
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_OPTIONS.map((a) => (
              <button key={a} onClick={() => update({ accentColor: a })} className={cn("h-7 w-7 rounded-full border-2 transition-transform", settings.accentColor === a ? "border-foreground scale-110" : "border-transparent")} style={{ background: `var(--accent-500)` }} data-accent={a} aria-label={a}>
                <span className="block h-full w-full rounded-full" style={{ background: accentSwatch(a) }} />
              </button>
            ))}
          </div>
        </Row>
        <Row label="Default note color">
          <RadioGroup value={settings.defaultNoteColorMode} onValueChange={(v) => update({ defaultNoteColorMode: v as any })} className="flex flex-col gap-2">
            {([["random","Random — a different color each note"],["theme","Theme-based — matches light/dark"],["choose","Choose color"]] as const).map(([v,label]) => (
              <Label key={v} htmlFor={v} className="flex items-center gap-2 cursor-pointer text-sm font-normal">
                <RadioGroupItem id={v} value={v} /> {label}
              </Label>
            ))}
          </RadioGroup>
        </Row>
        {settings.defaultNoteColorMode === "choose" && (
          <Row label="Choose default color">
            <div className="grid grid-cols-9 gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.id} onClick={() => update({ defaultNoteColor: c.id })} className={cn("h-7 w-7 rounded-full border-2", settings.defaultNoteColor === c.id ? "border-foreground" : "border-transparent")} style={{ background: c.id === "default" ? "var(--card)" : c.hex }} aria-label={c.label} />
              ))}
            </div>
          </Row>
        )}
        <Row label="Default note view">
          <Select value={settings.defaultView} onValueChange={(v) => update({ defaultView: v as any })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="list">List</SelectItem></SelectContent>
          </Select>
        </Row>
      </Section>

      {/* Show time on notes */}
      <Section icon={Clock} title="Show Time on Notes" desc="When and how timestamps appear on cards">
        <RadioGroup value={settings.showTime} onValueChange={(v) => update({ showTime: v as any })} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([["created","Created"],["edited","Edited"],["both","Both"],["hidden","Hidden"]] as const).map(([v,label]) => (
            <Label key={v} htmlFor={`st-${v}`} className="flex items-center justify-center gap-2 cursor-pointer text-sm font-normal h-10 rounded-xl border border-border/60 hover:bg-accent/40 has-[:checked]:border-primary has-[:checked]:bg-accent">
              <RadioGroupItem id={`st-${v}`} value={v} /> {label}
            </Label>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">Times use a relative format like “Edited 10 min ago” with full date on hover.</p>
      </Section>

      {/* Editor & fonts */}
      <Section icon={Type} title="Editor & Fonts" desc="Default editor, font family and text size">
        <Row label="Default editor">
          <Select value={settings.defaultEditor} onValueChange={(v) => update({ defaultEditor: v as any })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="basic">Basic</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
          </Select>
        </Row>
        <Row label="Editor font">
          <Select value={settings.editorFont} onValueChange={(v) => update({ editorFont: v })}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: mapFontFamily(f) }}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <Row label={`Font size — ${settings.editorFontSize}px`}>
          <div className="w-56">
            <Slider value={[settings.editorFontSize]} min={12} max={26} step={1} onValueChange={([v]) => update({ editorFontSize: v })} />
            <div className="flex gap-1 mt-2">
              {FONT_SIZE_PRESETS.map((p) => (
                <button key={p.value} onClick={() => update({ editorFontSize: p.value })} className={cn("flex-1 text-[10px] py-1 rounded-md", settings.editorFontSize === p.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}>{p.label}</button>
              ))}
            </div>
          </div>
        </Row>
        <div className="rounded-xl border border-border/60 p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Live preview</div>
          <p style={{ fontFamily: mapFontFamily(settings.editorFont), fontSize: settings.editorFontSize, lineHeight: 1.6 }}>
            The quick brown fox jumps over the lazy dog. 0123456789
          </p>
        </div>
        <Row label="Spell check" desc="Uses device spelling. Never sent to a remote service.">
          <Switch checked={settings.spellCheck} onCheckedChange={(v) => update({ spellCheck: v })} />
        </Row>
      </Section>

      {/* Checklist */}
      <Section icon={CheckSquare} title="Checklist Settings">
        <Row label="Move completed items to bottom"><Switch checked={settings.checklistMoveCompletedToBottom} onCheckedChange={(v) => update({ checklistMoveCompletedToBottom: v })} /></Row>
        <Row label="Hide completed items"><Switch checked={settings.checklistHideCompleted} onCheckedChange={(v) => update({ checklistHideCompleted: v })} /></Row>
      </Section>

      {/* Auto-save */}
      <Section icon={Save} title="Auto-save & Data Integrity">
        <Row label="Auto-save" desc="Save changes while editing"><Switch checked={settings.autoSave} onCheckedChange={(v) => update({ autoSave: v })} /></Row>
        <Row label={`Auto-save interval — ${settings.autoSaveInterval}s`}>
          <div className="w-56"><Slider value={[settings.autoSaveInterval]} min={1} max={15} step={1} onValueChange={([v]) => update({ autoSaveInterval: v })} disabled={!settings.autoSave} /></div>
        </Row>
        <Row label="Trash retention">
          <Select value={String(settings.trashRetentionDays)} onValueChange={(v) => update({ trashRetentionDays: Number(v) })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7">7 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectContent>
          </Select>
        </Row>
      </Section>

      {/* PrivateSafe */}
      <Section icon={ShieldCheck} title="PrivateSafe" desc="Encrypted local vault for sensitive notes">
        <Row label="Enable PrivateSafe"><Switch checked={settings.privateSafeEnabled} onCheckedChange={(v) => update({ privateSafeEnabled: v })} /></Row>
        {settings.privateSafeEnabled && (
          <>
            <Row label="Unlock methods">
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-2 text-sm font-normal"><Switch checked={settings.privateSafeUsePin} onCheckedChange={(v) => update({ privateSafeUsePin: v })} /> <Lock className="h-4 w-4" /> PIN</Label>
                <Label className="flex items-center gap-2 text-sm font-normal"><Switch checked={settings.privateSafeUsePattern} onCheckedChange={(v) => update({ privateSafeUsePattern: v })} /> <Grid3x3 className="h-4 w-4" /> Pattern</Label>
                <Label className="flex items-center gap-2 text-sm font-normal"><Switch checked={settings.privateSafeUseBiometric} onCheckedChange={(v) => update({ privateSafeUseBiometric: v })} /> <Fingerprint className="h-4 w-4" /> Biometric</Label>
              </div>
            </Row>
            <Row label="Set / change PIN">
              <Button variant="outline" size="sm" onClick={() => setPinSetupOpen(true)}>{settings.privateSafePin ? "Change" : "Set"} PIN</Button>
            </Row>
            <Row label="Auto-lock">
              <Select value={settings.privateSafeAutoLock} onValueChange={(v) => update({ privateSafeAutoLock: v as any })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediately on leave</SelectItem>
                  <SelectItem value="30s">After 30 seconds</SelectItem>
                  <SelectItem value="1m">After 1 minute</SelectItem>
                  <SelectItem value="5m">After 5 minutes</SelectItem>
                  <SelectItem value="background">When app backgrounded</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 inline mr-1 text-primary" />
              PrivateSafe notes are stored in app-private storage with local encryption. They are hidden from the file manager, gallery, and other apps. Device-level security can vary by device and OS.
            </div>
          </>
        )}
      </Section>

      {/* Search & behavior */}
      <Section icon={Search} title="Search & Behavior">
        <Row label="Include private notes in search" desc="Only previews shown after unlock"><Switch checked={settings.searchIncludePrivate} onCheckedChange={(v) => update({ searchIncludePrivate: v })} /></Row>
        <Row label="Haptic feedback"><Switch checked={settings.hapticFeedback} onCheckedChange={(v) => update({ hapticFeedback: v })} /></Row>
        <Row label="Animations"><Switch checked={settings.animations} onCheckedChange={(v) => update({ animations: v })} /></Row>
      </Section>

      {/* Export prefs */}
      <Section icon={Download} title="Export Preferences">
        <Row label="Include metadata (tags, dates, color)"><Switch checked={settings.exportIncludeMetadata} onCheckedChange={(v) => update({ exportIncludeMetadata: v })} /></Row>
        <Row label="Include attachments where supported"><Switch checked={settings.exportIncludeAttachments} onCheckedChange={(v) => update({ exportIncludeAttachments: v })} /></Row>
      </Section>

      {/* Storage */}
      <Section icon={HardDrive} title="Storage Usage" desc="All data is local to this device">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Notes" value={stats.notes} />
            <Stat label="Folders" value={stats.folders} />
            <Stat label="Tags" value={stats.tags} />
            <Stat label="In Trash" value={stats.trash} />
            <Stat label="Private" value={stats.privateNotes} />
            <Stat label="Attachments" value={stats.attachments} />
            <Stat label="Media size" value={formatFileSize(stats.attachmentBytes)} />
            <Stat label="Est. total" value={formatFileSize(stats.attachmentBytes + stats.notes * 2048)} />
          </div>
        )}
      </Section>

      {/* Backup & Import */}
      <BackupImportSection />

      {/* About */}
      <Section icon={Info} title="About LS Notes">
        <div className="flex items-center gap-3 mb-3">
          <Logo size={48} className="text-primary" />
          <div>
            <div className="font-bold">LS Notes</div>
            <div className="text-xs text-muted-foreground">Version 1.0.0 · Local-first</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          LS Notes stores your notes locally on your device and does not require an account, cloud sync, or server.
          No analytics, no tracking, no advertisements — ever.
        </p>
        <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 inline mr-1 text-primary" />
          Premium, private, offline-first note-taking. Built with Material Design 3 principles.
        </div>
      </Section>

      <PinSetupDialog open={pinSetupOpen} onOpenChange={setPinSetupOpen} />
    </div>
  );
}

function accentSwatch(a: string): string {
  const map: Record<string,string> = {
    emerald: "#10b981", teal: "#14b8a6", green: "#22c55e", rose: "#f43f5e",
    pink: "#ec4899", orange: "#f97316", amber: "#f59e0b", violet: "#8b5cf6",
    purple: "#a855f7", cyan: "#06b6d4",
  };
  return map[a] || "#10b981";
}

function mapFontFamily(f: string): string {
  const map: Record<string,string> = {
    "Raleway": "'Raleway', sans-serif",
    "Roboto": "'Roboto', sans-serif",
    "Ruda": "'Ruda', sans-serif",
    "Ubuntu": "'Ubuntu', sans-serif",
    "Zilla Slab": "'Zilla Slab', serif",
    "Sans-serif": "system-ui, sans-serif",
    "Serif": "Georgia, serif",
    "Monospace": "ui-monospace, monospace",
    "Inter": "'Inter', system-ui, sans-serif",
    "Poppins": "'Poppins', sans-serif",
    "Lora": "'Lora', serif",
    "Playfair Display": "'Playfair Display', serif",
    "JetBrains Mono": "'JetBrains Mono', monospace",
  };
  return map[f] || f;
}

function Section({ icon: Icon, title, desc, children }: { icon: any; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Icon className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border/60 p-3 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function PinSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { update } = useSettings();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const verify = useVerifyPrivateSafe();

  const save = () => {
    if (pin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    if (pin !== confirm) { toast.error("PINs don't match"); return; }
    update({ privateSafePin: pin });
    toast.success("PIN set");
    setPin(""); setConfirm(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Set PrivateSafe PIN</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Input type="password" inputMode="numeric" placeholder="New PIN (4-8 digits)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0,8))} autoFocus />
          <Input type="password" inputMode="numeric" placeholder="Confirm PIN" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0,8))} onKeyDown={(e) => e.key === "Enter" && save()} />
          <p className="text-xs text-muted-foreground">The PIN is stored locally as a one-way hash. It never leaves your device.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={pin.length < 4 || pin !== confirm}>Save PIN</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BackupImportSection() {
  const createNote = useCreateNote();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    const res = await fetch("/api/notes");
    const notes = await res.json();
    downloadFile(`LS_Notes_Backup_${new Date().toISOString().slice(0,10)}.json`, exportNotesAsJson(notes), "application/json");
    toast.success("Backup created");
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    let count = 0;
    if (ext === "json") {
      const { notes, error } = parseImportJson(text);
      if (error) { toast.error(error); return; }
      for (const n of notes) {
        await createNote.mutateAsync({ title: n.title || "Imported", content: n.content || [], type: n.type || "text", color: n.color || "default", tags: n.tags });
        count++;
      }
    } else if (ext === "md" || ext === "markdown") {
      const blocks = parseMarkdown(text);
      const title = file.name.replace(/\.(md|markdown)$/i, "");
      await createNote.mutateAsync({ title, content: blocks, type: "text" });
      count = 1;
    } else if (ext === "txt") {
      const blocks = [{ id: Math.random().toString(36).slice(2), type: "text", text, align: "left", marks: [] } as any];
      await createNote.mutateAsync({ title: file.name.replace(/\.txt$/i, ""), content: blocks, type: "text" });
      count = 1;
    } else if (ext === "html" || ext === "htm") {
      const tmp = document.createElement("div");
      tmp.innerHTML = text;
      const plain = tmp.innerText;
      const blocks = [{ id: Math.random().toString(36).slice(2), type: "text", text: plain, align: "left", marks: [] } as any];
      await createNote.mutateAsync({ title: file.name.replace(/\.(html?|)$/i, ""), content: blocks, type: "text" });
      count = 1;
    } else {
      toast.error("Unsupported file type");
      return;
    }
    toast.success(`Import completed: ${count} note${count !== 1 ? "s" : ""} added`);
  };

  return (
    <Section icon={Database} title="Backup & Import" desc="Local backup and migration via user-selected files">
      <Row label="Create JSON backup" desc="Full local backup of all notes"><Button variant="outline" size="sm" onClick={handleBackup}><Download className="h-4 w-4 mr-1" /> Backup</Button></Row>
      <Row label="Import notes" desc="JSON, Markdown, HTML, TXT">
        <input ref={fileRef} type="file" accept=".json,.md,.markdown,.txt,.html,.htm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} multiple />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Import file</Button>
      </Row>
      <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        Migration supports files from Evernote, OneNote, Google Keep, Pocket, Zoho, and others by importing their exported Markdown/HTML/JSON. Select official export files from your device — LS Notes never accesses other apps’ private data.
      </div>
    </Section>
  );
}
