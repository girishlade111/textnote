// LS Notes — PrivateSafe unlock (alias to verify, returns session token concept)
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api-helpers";
import { localHash } from "@/lib/notes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rows = await db.setting.findMany({
    where: { key: { in: ["privateSafePin", "privateSafePattern", "privateSafeUsePin", "privateSafeUsePattern", "privateSafeEnabled"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const enabled = map.privateSafeEnabled ? JSON.parse(map.privateSafeEnabled) : false;
  if (!enabled) return fail("PrivateSafe is not enabled", 400);

  const usePin = map.privateSafeUsePin ? JSON.parse(map.privateSafeUsePin) : true;
  const usePattern = map.privateSafeUsePattern ? JSON.parse(map.privateSafeUsePattern) : false;
  const storedPin = map.privateSafePin || null;
  const storedPattern = map.privateSafePattern || null;

  if (body.pin !== undefined && usePin && storedPin) {
    const match = localHash(body.pin) === storedPin;
    if (match) return ok({ unlocked: true, method: "pin", token: localHash("session-" + Date.now()) });
    return fail("Incorrect PIN", 401);
  }
  if (body.pattern !== undefined && usePattern && storedPattern) {
    const match = localHash(body.pattern) === storedPattern;
    if (match) return ok({ unlocked: true, method: "pattern", token: localHash("session-" + Date.now()) });
    return fail("Incorrect pattern", 401);
  }
  if (body.biometric) {
    // Biometric is handled client-side via WebAuthn / platform; trust the client assertion
    return ok({ unlocked: true, method: "biometric", token: localHash("session-" + Date.now()) });
  }
  return fail("Authentication failed", 401);
}
