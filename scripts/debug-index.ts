import { getPayload } from "payload";
import config from "../payload.config";

function parentIdOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in (v as Record<string, unknown>)) {
    const id = (v as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  }
  return null;
}

async function main() {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: "nodes", pagination: false, depth: 0, overrideAccess: false, select: { title: true, slug: true, type: true, status: true, parent: true } } as never);
  const docs = r.docs as Array<{ id: string|number; slug: string; type: string; status: string; parent: unknown; title: string }>;
  console.log("TOTAL", docs.length);
  for (const d of docs) console.log(d.type, d.slug, d.status, "parent=" + parentIdOf(d.parent), "title="+d.title.slice(0,30));
  const byId = new Map<string, typeof docs[number]>();
  for (const d of docs) byId.set(String(d.id), d);
  for (const d of docs.filter(d=>d.type==="chapter")) {
    console.log("\n--- chain for chapter", d.slug, d.title);
    const chain: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
    let curId: string | null = String(d.id);
    const seen = new Set<string>();
    for (let i=0;i<12 && curId;i++) {
      if (seen.has(curId)) break;
      seen.add(curId);
      const node = byId.get(curId);
      if (!node) { console.log(" missing node for", curId); break; }
      console.log("  node", node.type, node.slug, "parent", parentIdOf(node.parent));
      chain.unshift({ id: curId, slug: node.slug, type: node.type, parent: node.parent });
      curId = parentIdOf(node.parent);
    }
    const m = new Map(chain.map((n) => [n.type, n.slug] as const));
    console.log(" map", Object.fromEntries(m), "find chapter", chain.find((n)=>n.type==="chapter")?.slug);
    console.log(" check", m.get("branch"), m.get("year"), m.get("subject"), chain.find((n)=>n.type==="chapter")?.slug);
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
