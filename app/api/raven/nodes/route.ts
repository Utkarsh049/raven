import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { requireRavenKey, toSlug } from "@/lib/raven-api";

const ALLOWED_TYPES = new Set(["branch", "year", "subject", "chapter", "topic"]);

export async function GET(req: NextRequest) {
  const chk = requireRavenKey(req);
  if (!chk.ok) return chk.response;
  try {
    const payload = await getPayload({ config: configPromise });
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type")?.trim();
    const status = sp.get("status")?.trim();
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? 50), 1), 100);
    const where: Record<string, unknown> = {};
    if (type && ALLOWED_TYPES.has(type)) where.type = { equals: type };
    if (status && (status === "published" || status === "draft")) where.status = { equals: status };
    const r = await payload.find({
      collection: "nodes",
      where: Object.keys(where).length ? where : undefined,
      limit,
      depth: 0,
      pagination: true,
      overrideAccess: false,
    } as never);
    return NextResponse.json({ docs: r.docs, totalDocs: (r as { totalDocs?: number }).totalDocs ?? r.docs.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const chk = requireRavenKey(req);
  if (!chk.ok) return chk.response;
  try {
    const payload = await getPayload({ config: configPromise });
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      slug?: string;
      type?: string;
      parentSlug?: string;
      parentId?: string | number;
      parentType?: string;
      status?: string;
      blocks?: unknown[];
      orderIndex?: number;
    };
    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ error: `type must be one of: ${[...ALLOWED_TYPES].join(", ")}` }, { status: 400 });

    let parentId: string | number | null = body.parentId ?? null;
    if (!parentId && body.parentSlug) {
      const parentType = String(body.parentType ?? "").trim();
      const where: Record<string, unknown> = { slug: { equals: body.parentSlug } };
      if (parentType && ALLOWED_TYPES.has(parentType)) where.type = { equals: parentType };
      const pr = await payload.find({ collection: "nodes", where, limit: 1, depth: 0, pagination: false, overrideAccess: false } as never);
      const found = pr.docs?.[0] as { id: string | number } | undefined;
      if (found) parentId = found.id;
      else return NextResponse.json({ error: `No parent found for slug=${body.parentSlug}${parentType ? ` type=${parentType}` : ""}` }, { status: 404 });
    }

    const slug = String(body.slug ?? "").trim() ? String(body.slug).trim() : toSlug(title);
    const doc = await payload.create({
      collection: "nodes",
      data: {
        title,
        slug,
        type,
        parent: parentId ?? undefined,
        status: body.status === "published" ? "published" : "draft",
        orderIndex: typeof body.orderIndex === "number" ? body.orderIndex : 0,
        blocks: Array.isArray(body.blocks) ? body.blocks : [],
      } as never,
      overrideAccess: false,
    } as never);
    return NextResponse.json({ doc }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isSlugDup = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("slug");
    return NextResponse.json({ error: msg }, { status: isSlugDup ? 409 : 500 });
  }
}
