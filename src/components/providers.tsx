"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { GlobalSettingsSync } from "@/components/global-settings-sync";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={client}>
        <GlobalSettingsSync />
        {children}
        <SonnerToaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: "rounded-2xl border shadow-lg",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
