// LS Notes — PrivateSafe verify PIN/pattern (local-only, no network)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-helpers";
import { localHash } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rows = await db.setting.findMany({
    where: { key: { in: ["privateSafePin", "privateSafePattern", "privateSafeUsePin", "privateSafeUsePattern"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const usePin = map.privateSafeUsePin ? JSON.parse(map.privateSafeUsePin) : true;
  const usePattern = map.privateSafeUsePattern ? JSON.parse(map.privateSafeUsePattern) : false;
  const storedPin = map.privateSafePin || null;
  const storedPattern = map.privateSafePattern || null;

  if (body.pin !== undefined && usePin) {
    if (!storedPin) return fail("PrivateSafe not configured", 400);
    const match = localHash(body.pin) === storedPin;
    return ok({ ok: match, method: "pin" });
  }
  if (body.pattern !== undefined && usePattern) {
    if (!storedPattern) return fail("PrivateSafe not configured", 400);
    const match = localHash(body.pattern) === storedPattern;
    return ok({ ok: match, method: "pattern" });
  }
  return fail("No authentication method provided", 400);
}
