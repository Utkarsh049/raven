"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/nodes?limit=250&depth=0&sort=orderIndex", { credentials: "include" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    return (json.docs ?? []) as NodeDoc[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchDocs();
        if (!cancelled) setDocs(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDocs]);

  const data = useMemo(() => (docs ? buildTree(docs) : []), [docs]);

  const handleMove = useCallback(
    async (args: { dragIds: string[]; parentId: string | null; index: number }) => {
      if (!docs) return;
      const { dragIds, parentId, index } = args;
      if (dragIds.length === 0) return;
      setMoveError(null);
      setSaving(true);

      const keyOf = (pid: string | null) => pid ?? "__root__";
      const newParentKey = keyOf(parentId);
      const groups = new Map<string, NodeDoc[]>();
      for (const d of docs) {
        const k = keyOf(parentIdOf(d.parent));
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(d);
      }
      for (const [, arr] of groups) arr.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      const draggedSet = new Set(dragIds);
      const draggedDocs = dragIds.map((id) => docs.find((d) => d.id === id)).filter((x): x is NodeDoc => Boolean(x));
      if (draggedDocs.length === 0) {
        setSaving(false);
        return;
      }

      const oldParentKeys = new Set(draggedDocs.map((d) => keyOf(parentIdOf(d.parent))));

      for (const [k, arr] of groups) groups.set(k, arr.filter((d) => !draggedSet.has(d.id)));
      if (!groups.has(newParentKey)) groups.set(newParentKey, []);
      const target = groups.get(newParentKey)!;
      const insertAt = Math.max(0, Math.min(index, target.length));
      target.splice(insertAt, 0, ...draggedDocs);

      const affectedKeys = new Set<string>([newParentKey, ...oldParentKeys]);
      const updates: Array<{ id: string; parent: string | null; orderIndex: number }> = [];
      for (const k of affectedKeys) {
        const arr = groups.get(k) ?? [];
        const expectedParent = k === "__root__" ? null : k;
        arr.forEach((doc, newIdx) => {
          const orig = docs.find((d) => d.id === doc.id)!;
          const origParent = parentIdOf(orig.parent);
          if (origParent !== expectedParent || (orig.orderIndex ?? 0) !== newIdx) {
            updates.push({ id: doc.id, parent: expectedParent, orderIndex: newIdx });
          }
        });
      }

      if (updates.length === 0) {
        setSaving(false);
        return;
      }

      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const optimistic: NodeDoc[] = docs.map((d) => {
        const u = updateMap.get(d.id);
        return u ? { ...d, parent: u.parent as unknown as NodeDoc["parent"], orderIndex: u.orderIndex } : d;
      });
      const prev = docs;
      setDocs(optimistic);

      try {
        const results = await Promise.all(
          updates.map(async (u) => {
            const res = await fetch(`/api/nodes/${u.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ parent: u.parent, orderIndex: u.orderIndex }),
            });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`${u.id}: ${res.status} ${text.slice(0, 300)}`);
            }
          }),
        );
        void results;
      } catch (e) {
        setDocs(prev);
        setMoveError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [docs],
  );

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
          <p className="mt-1 text-sm text-zinc-500">Branch → Year → Subject → Chapter → Topic · drag to reorder / reparent</p>
        </div>
        <a
          href="/admin/collections/nodes"
          className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          Manage in Nodes
        </a>
      </div>

      {saving && <p className="mb-2 text-xs text-amber-600">Saving order…</p>}
      {moveError && <p className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{moveError}</p>}

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
            data={data}
            openByDefault={false}
            width={720}
            height={560}
            indent={22}
            rowHeight={36}
            overscanCount={4}
            onMove={handleMove as never}
          >
            {({ node, style, dragHandle }) => (
              <div
                ref={dragHandle as never}
                style={style}
                className="flex items-center gap-2 border-b border-zinc-100 px-2 text-sm dark:border-zinc-900"
                title={`${node.data.doc.type} · ${node.data.doc.slug} · ${node.data.doc.status}`}
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
            {docs.length} node{docs.length === 1 ? "" : "s"} · drag any row by its handle to reorder or move between parents ·{" "}
            <span className="font-mono">/admin/taxonomy</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default TaxonomyView;
