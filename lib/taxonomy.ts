type NodeLite = { id: string; slug: string; type: string; parent: unknown };

function parentIdOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in (v as Record<string, unknown>)) {
    const id = (v as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  }
  return null;
}

export async function resolveChapterPath(
  payload: { find: (args: { collection: string; where?: unknown; limit?: number; depth?: number; pagination?: boolean }) => Promise<{ docs: NodeLite[] }> },
  nodeId: string,
): Promise<string | null> {
  const chain: NodeLite[] = [];
  let curId: string | null = nodeId;
  const seen = new Set<string>();

  for (let i = 0; i < 12 && curId; i++) {
    if (seen.has(curId)) break;
    seen.add(curId);
    const res = await payload.find({
      collection: "nodes",
      where: { id: { equals: curId } },
      limit: 1,
      depth: 0,
      pagination: false,
    } as never);
    const doc = res.docs[0];
    if (!doc) break;
    chain.unshift(doc);
    curId = parentIdOf(doc.parent);
  }

  if (chain.length === 0) return null;

  const typeToSlug = new Map(chain.map((n) => [n.type, n.slug] as const));
  const branch = typeToSlug.get("branch");
  const year = typeToSlug.get("year");
  const subject = typeToSlug.get("subject");
  const chapter = chain.find((n) => n.type === "chapter")?.slug ?? chain[chain.length - 1]?.slug;

  if (!branch || !year || !subject || !chapter) return null;
  return `/${branch}/${year}/${subject}/${chapter}`;
}
