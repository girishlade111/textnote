"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  const data = await res.json();
  return { ...DEFAULT_SETTINGS, ...data };
}

async function putSettings(partial: Partial<AppSettings>) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  return res.json();
}

export function useSettings() {
  const qc = useQueryClient();
  const { settings, loaded, hydrate, set } = useSettingsStore();

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (query.data) hydrate(query.data);
  }, [query.data, hydrate]);

  const mutation = useMutation({
    mutationFn: putSettings,
    onMutate: async (partial) => {
      // optimistic update
      set(partial);
      return { previous: settings };
    },
    onSuccess: (data) => {
      hydrate(data);
      qc.setQueryData(["settings"], data);
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) hydrate(ctx.previous);
    },
  });

  const update = (partial: Partial<AppSettings>) => {
    mutation.mutate(partial);
  };

  return { settings, loaded, update, saving: mutation.isPending };
}

// Apply theme + accent + font to <html>
export function useApplySettings() {
  const settings = useSettingsStore((s) => s.settings);
  useEffect(() => {
    const root = document.documentElement;
    // theme
    if (settings.themeMode === "dark") root.classList.add("dark");
    else if (settings.themeMode === "light") root.classList.remove("dark");
    else {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      if (mql.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    }
    // accent
    root.setAttribute("data-accent", settings.accentColor || "emerald");
    // font family applied via CSS variable on editor elements only
    root.style.setProperty("--ls-editor-font", settings.editorFont || "Raleway");
    root.style.setProperty("--ls-editor-size", `${settings.editorFontSize || 16}px`);
  }, [settings.themeMode, settings.accentColor, settings.editorFont, settings.editorFontSize]);

  // System theme listener
  useEffect(() => {
    if (settings.themeMode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mql.matches) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [settings.themeMode]);
}
