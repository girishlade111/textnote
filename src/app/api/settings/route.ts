// LS Notes — Settings (key/value singleton-ish store)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-helpers";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";
import { localHash } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  // Merge with defaults; parse JSON fields
  const merged: any = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (map[key] !== undefined) {
      try {
        merged[key] = JSON.parse(map[key]);
      } catch {
        merged[key] = map[key];
      }
    }
  }
  return ok(merged);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<AppSettings>;
  // Hash private safe secrets before storage
  const toStore: any = { ...body };
  if (body.privateSafePin !== undefined) {
    toStore.privateSafePin = body.privateSafePin ? localHash(body.privateSafePin) : null;
  }
  if (body.privateSafePattern !== undefined) {
    toStore.privateSafePattern = body.privateSafePattern ? localHash(body.privateSafePattern) : null;
  }
  for (const [key, value] of Object.entries(toStore)) {
    const val = typeof value === "string" ? value : JSON.stringify(value);
    await db.setting.upsert({
      where: { key },
      create: { key, value: val },
      update: { value: val },
    });
  }
  // Re-read and return merged (with secrets masked)
  const rows = await db.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const merged: any = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (map[key] !== undefined) {
      try {
        merged[key] = JSON.parse(map[key]);
      } catch {
        merged[key] = map[key];
      }
    }
  }
  // Don't return actual hashed secrets, just whether set
  merged.privateSafePinSet = !!merged.privateSafePin;
  merged.privateSafePatternSet = !!merged.privateSafePattern;
  return ok(merged);
}
