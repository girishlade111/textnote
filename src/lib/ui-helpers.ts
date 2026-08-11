"use client";

// LS Notes — small client UI helpers (haptics, copy, download)

export function haptic(ms = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {}
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function shareContent(data: { title?: string; text?: string; url?: string; files?: File[] }): Promise<boolean> {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    const payload: any = {};
    if (data.title) payload.title = data.title;
    if (data.text) payload.text = data.text;
    if (data.url) payload.url = data.url;
    if (data.files?.length && "canShare" in navigator) {
      const nav = navigator as any;
      if (nav.canShare({ files: data.files })) payload.files = data.files;
    }
    return navigator.share(payload).then(() => true).catch(() => false);
  }
  return Promise.resolve(false);
}
