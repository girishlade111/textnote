import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "LS Notes — Private Notes, Beautifully Organized",
  description:
    "LS Notes is a premium, private, local-first note-taking app. Capture ideas as text, checklists, photos, audio, sketches and more — fully offline, no accounts, no cloud.",
  keywords: ["LS Notes", "notes", "private notes", "offline notes", "checklist", "notebook"],
  authors: [{ name: "LS Notes" }],
  applicationName: "LS Notes",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LS Notes",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "LS Notes",
    description: "Private notes, beautifully organized. Fully local, offline-first.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
