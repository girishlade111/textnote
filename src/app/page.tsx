"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { SectionRouter } from "@/components/section-router";
import { CreateMenu } from "@/components/create-menu";
import { NoteEditor } from "@/components/note-editor";
import { NoteInfoSheet } from "@/components/note-info-sheet";
import { useApplySettings, fetchSettings } from "@/hooks/use-settings";
import { useSettingsStore } from "@/lib/stores";
import { idbClearDemoNotes } from "@/lib/idb";

export default function Home() {
  useApplySettings();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const qc = useQueryClient();

  // Hydrate settings once on mount
  useEffect(() => {
    fetchSettings().then(hydrate).catch(() => {});
  }, [hydrate]);

  // Purge demo notes if present
  useEffect(() => {
    idbClearDemoNotes()
      .then(() => {
        qc.invalidateQueries({ queryKey: ["notes"] });
        qc.invalidateQueries({ queryKey: ["folders"] });
        qc.invalidateQueries({ queryKey: ["tags"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
      })
      .catch(() => {});
  }, [qc]);

  return (
    <>
      <AppShell>
        <SectionRouter />
      </AppShell>
      <CreateMenu />
      <NoteEditor />
      <NoteInfoSheet />
    </>
  );
}
