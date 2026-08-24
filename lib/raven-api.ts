import { NextRequest, NextResponse } from "next/server";

export function requireRavenKey(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const expected = process.env.RAVEN_API_KEY?.trim();
  if (!expected) {
    return { ok: false, response: NextResponse.json({ error: "RAVEN_API_KEY not configured on server" }, { status: 503 }) };
  }
  const auth = req.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-raven-key")?.trim() ?? "";
  const got = bearer || header;
  if (!got || got !== expected) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized — missing or invalid RAVEN_API_KEY" }, { status: 401 }) };
  }
  return { ok: true };
}

export function toSlug(input: string): string {
  const s = String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "untitled";
}

export async function findNodeBySlug(payload: { find: (a: unknown) => Promise<{ docs: Array<{ id: string | number; slug: string; type: string }> }> }, slug: string, type: string) {
  const r = await payload.find({ collection: "nodes", where: { slug: { equals: slug }, type: { equals: type } }, limit: 1, depth: 0, pagination: false, overrideAccess: false } as never);
  return (r.docs?.[0] as { id: string | number; slug: string; type: string } | undefined) ?? null;
}
