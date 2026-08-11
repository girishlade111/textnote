"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Fingerprint, Grid3x3, Delete, ArrowLeft, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { usePrivateSafeStore, useSettingsStore } from "@/lib/stores";
import { useApp } from "@/lib/app-store";
import { useUnlockPrivateSafe, useNotes } from "@/hooks/use-data";
import { NotesView } from "@/components/notes-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { haptic } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";

export function PrivateSafeView({ unlocked, search }: { unlocked: boolean; search: string }) {
  const settings = useSettingsStore((s) => s.settings);
  const { lock, unlock } = usePrivateSafeStore();

  if (!settings.privateSafeEnabled) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6">
        <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
          <ShieldCheck className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">PrivateSafe is not set up</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-5">
          PrivateSafe is a protected, encrypted area for your most sensitive notes. Set it up in Settings with a PIN, pattern, or biometric lock.
        </p>
        <Button onClick={() => useApp.getState().setSection("settings")}>Set up PrivateSafe</Button>
      </div>
    );
  }

  if (!unlocked) {
    return <PrivateSafeGate onUnlock={unlock} />;
  }

  return <PrivateSafeContent search={search} onLock={lock} />;
}

function PrivateSafeGate({ onUnlock }: { onUnlock: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const unlockMut = useUnlockPrivateSafe();
  const [method, setMethod] = useState<"pin" | "pattern" | "biometric">(
    settings.privateSafeUsePin ? "pin" : settings.privateSafeUsePattern ? "pattern" : "biometric"
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

  const submitPin = () => {
    if (pin.length < 4) { setError("Enter at least 4 digits"); return; }
    unlockMut.mutate({ pin }, {
      onSuccess: () => { haptic(20); onUnlock(); toast.success("PrivateSafe unlocked"); },
      onError: (e: any) => { haptic(50); setError(e.message || "Incorrect PIN"); setPin(""); },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 px-6 max-w-sm mx-auto"
    >
      <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
        <ShieldCheck className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-1">Unlock PrivateSafe</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Your private notes are encrypted and stored in app-private storage. Authenticate to continue.
      </p>

      {(settings.privateSafeUsePin || settings.privateSafeUsePattern || settings.privateSafeUseBiometric) && (
        <div className="flex gap-1 p-1 rounded-full bg-muted mb-6">
          {settings.privateSafeUsePin && (
            <button onClick={() => setMethod("pin")} className={cn("px-4 h-8 rounded-full text-xs font-medium", method === "pin" ? "bg-background elev-1" : "text-muted-foreground")}>
              <Lock className="h-3 w-3 inline mr-1" /> PIN
            </button>
          )}
          {settings.privateSafeUsePattern && (
            <button onClick={() => setMethod("pattern")} className={cn("px-4 h-8 rounded-full text-xs font-medium", method === "pattern" ? "bg-background elev-1" : "text-muted-foreground")}>
              <Grid3x3 className="h-3 w-3 inline mr-1" /> Pattern
            </button>
          )}
          {settings.privateSafeUseBiometric && (
            <button onClick={() => setMethod("biometric")} className={cn("px-4 h-8 rounded-full text-xs font-medium", method === "biometric" ? "bg-background elev-1" : "text-muted-foreground")}>
              <Fingerprint className="h-3 w-3 inline mr-1" /> Bio
            </button>
          )}
        </div>
      )}

      {method === "pin" && (
        <div className="w-full space-y-3">
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
              placeholder="Enter PIN"
              className="text-center text-2xl tracking-[0.5em] h-14 rounded-2xl"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submitPin()}
            />
            <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label="Toggle PIN visibility">
              {showPin ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button className="w-full h-12 rounded-2xl" onClick={submitPin} disabled={unlockMut.isPending}>
            {unlockMut.isPending ? "Verifying…" : "Unlock"}
          </Button>
        </div>
      )}

      {method === "pattern" && <PatternLock onSuccess={(p) => unlockMut.mutate({ pattern: p }, { onSuccess: () => { haptic(20); onUnlock(); }, onError: (e:any) => { haptic(50); setError(e.message); } })} error={error} />}

      {method === "biometric" && (
        <div className="w-full space-y-3 text-center">
          <Button variant="outline" className="w-full h-14 rounded-2xl" onClick={() => unlockMut.mutate({ biometric: true }, { onSuccess: () => { haptic(20); onUnlock(); }, onError: (e:any) => { setError(e.message); } })}>
            <Fingerprint className="h-5 w-5 mr-2" /> Authenticate
          </Button>
          <p className="text-[11px] text-muted-foreground">Biometric availability depends on your device.</p>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-xl p-3">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Device-level security can vary by device and OS. LS Notes uses the strongest available local protection and never transmits your data.</span>
      </div>
    </motion.div>
  );
}

// 3x3 pattern lock
function PatternLock({ onSuccess, error }: { onSuccess: (pattern: string) => void; error?: string }) {
  const [selected, setSelected] = useState<number[]>([]);
  const dragging = useState(false)[0];

  const handleSelect = (i: number) => {
    if (selected.includes(i)) return;
    haptic(8);
    const next = [...selected, i];
    setSelected(next);
    if (next.length >= 4) {
      setTimeout(() => {
        onSuccess(next.join("-"));
        setSelected([]);
      }, 150);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto my-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <button
            key={i}
            onMouseDown={() => handleSelect(i)}
            className={cn(
              "aspect-square rounded-full border-2 flex items-center justify-center transition-all",
              selected.includes(i) ? "border-primary bg-primary/20 scale-110" : "border-border hover:border-primary/40"
            )}
            aria-label={`Pattern dot ${i + 1}`}
          >
            <span className={cn("h-3 w-3 rounded-full", selected.includes(i) ? "bg-primary" : "bg-muted-foreground/30")} />
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mb-2">{selected.length}/4 minimum</p>
      {error && <p className="text-xs text-destructive text-center mb-2">{error}</p>}
      <p className="text-center text-[11px] text-muted-foreground">Tap at least 4 dots in a sequence</p>
    </div>
  );
}

function PrivateSafeContent({ search, onLock }: { search: string; onLock: () => void }) {
  const { data, isLoading } = useNotes("private");
  const settings = useSettingsStore((s) => s.settings);

  // auto-lock behavior
  useEffect(() => {
    if (settings.privateSafeAutoLock === "background") {
      const onHide = () => onLock();
      document.addEventListener("visibilitychange", () => { if (document.hidden) onHide(); });
      return () => document.removeEventListener("visibilitychange", onHide);
    }
  }, [settings.privateSafeAutoLock, onLock]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">PrivateSafe unlocked</span>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onLock}>
          <Lock className="h-4 w-4 mr-1" /> Lock now
        </Button>
      </div>
      <NotesView
        notes={data || []}
        loading={isLoading}
        query={search}
        emptyTitle="No private notes"
        emptyHint="Move sensitive notes here with “Add to PrivateSafe” from any note menu."
      />
    </div>
  );
}
