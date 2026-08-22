"use client";

import { useEffect, useMemo, useState } from "react";
import { Tree } from "react-arborist";

type NodeDoc = {
  id: string;
  title: string;
  slug: string;
  type: "branch" | "year" | "subject" | "chapter" | "topic";
  parent: string | { id: string } | null;
  orderIndex: number;
  status: "draft" | "published";
};

type ArborNode = { id: string; name: string; children?: ArborNode[]; doc: NodeDoc };

const TYPE_LABEL: Record<NodeDoc["type"], string> = {
  branch: "Branch",
  year: "Year",
  subject: "Subject",
  chapter: "Chapter",
  topic: "Topic",
};

const TYPE_DOT: Record<NodeDoc["type"], string> = {
  branch: "bg-violet-500",
  year: "bg-blue-500",
  subject: "bg-emerald-500",
  chapter: "bg-amber-500",
  topic: "bg-zinc-400",
};

function parentIdOf(v: NodeDoc["parent"]): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  return v.id ?? null;
}

function buildTree(docs: NodeDoc[]): ArborNode[] {
  const byId = new Map<string, ArborNode>();
  for (const d of docs) byId.set(d.id, { id: d.id, name: d.title, doc: d, children: [] });
  const roots: ArborNode[] = [];
  const sorted = [...docs].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  for (const d of sorted) {
    const node = byId.get(d.id)!;
    const pid = parentIdOf(d.parent);
    if (pid && byId.has(pid)) byId.get(pid)!.children!.push(node);
    else roots.push(node);
  }
  const sortChildren = (n: ArborNode) => {
    n.children?.sort((a, b) => (a.doc.orderIndex ?? 0) - (b.doc.orderIndex ?? 0));
    n.children?.forEach(sortChildren);
  };
  roots.forEach(sortChildren);
  const prune = (n: ArborNode) => {
    if (n.children?.length === 0) delete n.children;
    else n.children?.forEach(prune);
  };
  roots.forEach(prune);
  return roots;
}

export function TaxonomyView() {
  const [docs, setDocs] = useState<NodeDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/nodes?limit=250&depth=0&sort=orderIndex", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        if (!cancelled) setDocs((json.docs ?? []) as NodeDoc[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => (docs ? buildTree(docs) : []), [docs]);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Taxonomy</h1>
        <p className="mt-2 text-sm text-red-600">Failed to load nodes: {error}</p>
        <p className="mt-1 text-xs text-zinc-500">Create nodes in Collections → Nodes, then refresh.</p>
      </div>
    );
  }

  if (!docs) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Taxonomy</h1>
        <p className="mt-4 text-sm text-zinc-500">Loading taxonomy…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Taxonomy</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Branch → Year → Subject → Chapter → Topic · read-only preview — drag/crud lands in the next slice
          </p>
        </div>
        <a
          href="/admin/collections/nodes"
          className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          Manage in Nodes
        </a>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
          No nodes yet. Create your first Branch in{" "}
          <a className="underline" href="/admin/collections/nodes/create">
            Nodes → Create
          </a>
          , then come back here.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border bg-white dark:bg-zinc-950">
          <Tree
            initialData={data}
            openByDefault={false}
            width={720}
            height={560}
            indent={22}
            rowHeight={36}
            overscanCount={4}
          >
            {({ node, style, dragHandle }) => (
              <div
                ref={dragHandle as never}
                style={style}
                className="flex items-center gap-2 border-b border-zinc-100 px-2 text-sm dark:border-zinc-900"
                title={`${TYPE_LABEL[node.data.doc.type]} · ${node.data.doc.slug} · ${node.data.doc.status}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[node.data.doc.type]}`} />
                <span className="truncate font-medium">{node.data.name}</span>
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {node.data.doc.type}
                </span>
                <span className="truncate text-xs text-zinc-500">/{node.data.doc.slug}</span>
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${node.data.doc.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"}`}
                >
                  {node.data.doc.status}
                </span>
              </div>
            )}
          </Tree>
          <p className="border-t px-3 py-2 text-xs text-zinc-500">
            {docs.length} node{docs.length === 1 ? "" : "s"} · visit{" "}
            <span className="font-mono">/admin/taxonomy</span> for this view
          </p>
        </div>
      )}
    </div>
  );
}

export default TaxonomyView;
