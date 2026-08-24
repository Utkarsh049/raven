import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { requireRavenKey, toSlug } from "@/lib/raven-api";

type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown> };

const TOOLS: ToolDef[] = [
  {
    name: "list_nodes",
    description: "List taxonomy nodes. Filter by type (branch|year|subject|chapter|topic) and status (published|draft).",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string" }, status: { type: "string" }, limit: { type: "number" } },
    },
  },
  {
    name: "create_node",
    description: "Create a taxonomy node (branch, year, subject, chapter, topic). Provide parentSlug+parentType or parentId to place it in the tree. Blocks only for chapter/topic.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["branch", "year", "subject", "chapter", "topic"] },
        slug: { type: "string" },
        parentSlug: { type: "string" },
        parentType: { type: "string" },
        parentId: { type: ["string", "number"] },
        status: { type: "string", enum: ["draft", "published"] },
        blocks: { type: "array" },
      },
      required: ["title", "type"],
    },
  },
  {
    name: "publish_node",
    description: "Publish a node by id (sets status=published). Triggers revalidation/search index via hooks.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "search_nodes",
    description: "Search published nodes by title/slug substring (uses GET /api/raven/nodes + server-side filter for now).",
    inputSchema: { type: "object", properties: { q: { type: "string" }, type: { type: "string" } }, required: ["q"] },
  },
];

async function handleTool(name: string, args: Record<string, unknown>, payload: Awaited<ReturnType<typeof getPayload>>) {
  if (name === "list_nodes") {
    const type = String(args.type ?? "").trim();
    const status = String(args.status ?? "").trim();
    const limit = Math.min(Math.max(Number(args.limit ?? 50), 1), 100);
    const where: Record<string, unknown> = {};
    if (type) where.type = { equals: type };
    if (status) where.status = { equals: status };
    const r = await payload.find({ collection: "nodes", where: Object.keys(where).length ? where : undefined, limit, depth: 0, pagination: true, overrideAccess: false } as never);
    return { docs: r.docs, totalDocs: (r as { totalDocs?: number }).totalDocs ?? r.docs.length };
  }
  if (name === "create_node") {
    const title = String(args.title ?? "").trim();
    const type = String(args.type ?? "").trim();
    if (!title || !type) throw new Error("title and type are required");
    let parentId: string | number | null = (args.parentId as string | number | null) ?? null;
    const parentSlug = String(args.parentSlug ?? "").trim();
    if (!parentId && parentSlug) {
      const parentType = String(args.parentType ?? "").trim();
      const where: Record<string, unknown> = { slug: { equals: parentSlug } };
      if (parentType) where.type = { equals: parentType };
      const pr = await payload.find({ collection: "nodes", where, limit: 1, depth: 0, pagination: false, overrideAccess: false } as never);
      const found = pr.docs?.[0] as { id: string | number } | undefined;
      if (!found) throw new Error(`No parent found for slug=${parentSlug}`);
      parentId = found.id;
    }
    const slug = String(args.slug ?? "").trim() || toSlug(title);
    const doc = await payload.create({
      collection: "nodes",
      data: {
        title,
        slug,
        type,
        parent: parentId ?? undefined,
        status: args.status === "published" ? "published" : "draft",
        blocks: Array.isArray(args.blocks) ? args.blocks : [],
      } as never,
      overrideAccess: false,
    } as never);
    return { doc };
  }
  if (name === "publish_node") {
    const id = String(args.id ?? "").trim();
    if (!id) throw new Error("id is required");
    const doc = await payload.update({ collection: "nodes", id, data: { status: "published" } as never, overrideAccess: false } as never);
    return { doc };
  }
  if (name === "search_nodes") {
    const q = String(args.q ?? "").trim().toLowerCase();
    if (!q) throw new Error("q is required");
    const type = String(args.type ?? "").trim();
    const where: Record<string, unknown> = { status: { equals: "published" } };
    if (type) where.type = { equals: type };
    const r = await payload.find({ collection: "nodes", where, limit: 50, depth: 0, pagination: false, overrideAccess: false } as never);
    const docs = (r.docs as Array<{ title?: string; slug?: string } & Record<string, unknown>>).filter(
      (d) => String(d.title ?? "").toLowerCase().includes(q) || String(d.slug ?? "").toLowerCase().includes(q),
    );
    return { docs, totalDocs: docs.length };
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function GET(req: NextRequest) {
  const chk = requireRavenKey(req);
  if (!chk.ok) return chk.response;
  return NextResponse.json({ name: "raven-mcp", version: "1.0.0", tools: TOOLS.map((t) => ({ name: t.name, description: t.description })) });
}

export async function POST(req: NextRequest) {
  const chk = requireRavenKey(req);
  if (!chk.ok) return chk.response;
  try {
    const payload = await getPayload({ config: configPromise });
    const body = (await req.json().catch(() => ({}))) as {
      tool?: string;
      name?: string;
      arguments?: Record<string, unknown>;
      args?: Record<string, unknown>;
      id?: string;
    };

    // MCP-ish: { tool: "list_nodes", arguments: {...} } or { name: "list_nodes", arguments: {...} }
    const toolName = String(body.tool ?? body.name ?? "").trim();
    const toolArgs = (body.arguments ?? body.args ?? {}) as Record<string, unknown>;

    // JSON-RPC MCP variant: { jsonrpc, id, method: "tools/call", params: { name, arguments } }
    const rpcMethod = (body as { method?: string }).method;
    if (rpcMethod === "tools/list") {
      return NextResponse.json({ tools: TOOLS });
    }
    if (rpcMethod === "tools/call") {
      const params = (body as { params?: { name?: string; arguments?: Record<string, unknown> } }).params;
      const t = String(params?.name ?? "").trim();
      const a = (params?.arguments ?? {}) as Record<string, unknown>;
      const result = await handleTool(t, a, payload);
      return NextResponse.json({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false });
    }
    if (rpcMethod === "initialize") {
      return NextResponse.json({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "raven-mcp", version: "1.0.0" } });
    }

    if (!toolName) return NextResponse.json({ error: "Missing tool/name. Use { tool, arguments } or JSON-RPC { method: 'tools/call', params: { name, arguments } }" }, { status: 400 });
    const result = await handleTool(toolName, toolArgs, payload);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
