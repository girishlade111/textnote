"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores";
import { useApplySettings, fetchSettings } from "@/hooks/use-settings";

// Keeps the settings store hydrated and in sync app-wide, regardless of which
// view is currently mounted. This fixes the stale-store bug where components
// reading useSettingsStore directly (NoteCard, PrivateSafeView, NoteEditor)
// wouldn't reflect changes made elsewhere.
export function GlobalSettingsSync() {
  const hydrate = useSettingsStore((s) => s.hydrate);
  useApplySettings();

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data, hydrate]);

  // Re-sync when window refocuses (catches external mutations)
  useEffect(() => {
    const onFocus = () => query.refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [query]);

  return null;
}
