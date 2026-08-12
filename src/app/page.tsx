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
import { useStats } from "@/hooks/use-data";
import { idbSeedInitialData } from "@/lib/idb";

export default function Home() {
  useApplySettings();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const qc = useQueryClient();

  // Hydrate settings once on mount
  useEffect(() => {
    fetchSettings().then(hydrate).catch(() => {});
  }, [hydrate]);

  // Seed demo notes locally if empty on first run
  const { data: stats } = useStats();
  useEffect(() => {
    if (stats && stats.notes === 0 && stats.trash === 0) {
      idbSeedInitialData()
        .then((res) => {
          if (res.seeded) {
            qc.invalidateQueries({ queryKey: ["notes"] });
            qc.invalidateQueries({ queryKey: ["folders"] });
            qc.invalidateQueries({ queryKey: ["tags"] });
            qc.invalidateQueries({ queryKey: ["stats"] });
          }
        })
        .catch(() => {});
    }
  }, [stats?.notes, stats?.trash, qc]);

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
