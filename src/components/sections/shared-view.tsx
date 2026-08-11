"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, FileJson, FileText, FileType, FileCode, FileArchive } from "lucide-react";
import { useNotes } from "@/hooks/use-data";
import { useSettingsStore } from "@/lib/stores";
import { NotesView } from "@/components/notes-view";
import { Button } from "@/components/ui/button";
import { noteToExportFilename, exportNotesAsJson, noteToMarkdown, noteToText, blocksToHtml, exportNoteAsPdf } from "@/lib/export";
import { downloadFile } from "@/lib/ui-helpers";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import type { NoteDto } from "@/lib/types";

export function SharedView({ search }: { search: string }) {
  const { data, isLoading } = useNotes("all");
  const settings = useSettingsStore((s) => s.settings);
  const notes = (data || []).filter((n) => n.isArchived || (!search ? true : true));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allNotes = data || [];

  const exportAll = (format: "json" | "md" | "txt" | "html") => {
    haptic();
    const date = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadFile(`LS_Notes_Backup_${date}.json`, exportNotesAsJson(allNotes), "application/json");
    } else {
      // combine
      const content = allNotes.map((n) => {
        if (format === "md") return noteToMarkdown(n, settings.exportIncludeMetadata);
        if (format === "txt") return noteToText(n);
        return blocksToHtml(n.content, { metadata: settings.exportIncludeMetadata, note: n });
      }).join(format === "html" ? "<hr/>" : "\n\n---\n\n");
      const ext = format === "md" ? "md" : format === "txt" ? "txt" : "html";
      downloadFile(`LS_Notes_Export_${date}.${ext}`, content, format === "html" ? "text/html" : "text/plain");
    }
    toast.success(`Exported ${allNotes.length} notes as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Export & Share Center</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Export individual notes, folders, tags, or everything. Files save locally — you choose where.
              {settings.exportIncludeMetadata ? " Metadata is included." : " Metadata excluded."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <Button variant="outline" className="justify-start" onClick={() => exportAll("json")}>
            <FileJson className="h-4 w-4 mr-2" /> JSON Backup
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => exportAll("md")}>
            <FileCode className="h-4 w-4 mr-2" /> Markdown
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => exportAll("txt")}>
            <FileText className="h-4 w-4 mr-2" /> Plain Text
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => exportAll("html")}>
            <FileType className="h-4 w-4 mr-2" /> HTML
          </Button>
        </div>
      </div>

      <NotesView
        notes={notes}
        loading={isLoading}
        query={search}
        emptyTitle="No notes to export"
        emptyHint="Create some notes first, then export them here."
      />
    </div>
  );
}
