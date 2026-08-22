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

const CREATE_TYPES: Array<{ value: NodeDoc["type"]; label: string }> = [
  { value: "branch", label: "Branch" },
  { value: "year", label: "Year" },
  { value: "subject", label: "Subject" },
  { value: "chapter", label: "Chapter" },
  { value: "topic", label: "Topic" },
];

function slugify(input: string) {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "untitled";
}

export function TaxonomyView() {
  const [docs, setDocs] = useState<NodeDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [createParent, setCreateParent] = useState<string | null>(null);
  const [createType, setCreateType] = useState<NodeDoc["type"]>("chapter");
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

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

  const openCreate = useCallback((parentId: string | null, preferred?: NodeDoc["type"]) => {
    setCreateParent(parentId);
    if (preferred) setCreateType(preferred);
    setCreateTitle("");
    setCreateSlug("");
    setCreateSlugTouched(false);
    setCreateError(null);
  }, []);

  const submitCreate = useCallback(async () => {
    const title = createTitle.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }
    const slug = (createSlugTouched ? createSlug.trim() : slugify(title)) || slugify(title);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setCreateError("Slug must be lowercase alphanumeric with hyphens.");
      return;
    }
    if (!docs) return;
    const siblings = docs.filter((d) => parentIdOf(d.parent) === createParent);
    const orderIndex = siblings.length === 0 ? 0 : Math.max(...siblings.map((d) => d.orderIndex ?? 0)) + 1;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, type: createType, parent: createParent, orderIndex, status: "draft" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text.slice(0, 400)}`);
      }
      const json = await res.json();
      const created = (json.doc ?? json) as NodeDoc;
      setDocs((prev) => (prev ? [...prev, created] : [created]));
      setCreateParent("__done__" as unknown as string | null);
      setCreateTitle("");
      setCreateSlug("");
      setCreateSlugTouched(false);
      setTimeout(() => setCreateParent(null), 600);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreateBusy(false);
    }
  }, [createParent, createSlug, createSlugTouched, createTitle, createType, docs]);

  const beginRename = useCallback(
    (doc: NodeDoc) => {
      setEditingId(doc.id);
      setEditTitle(doc.title);
      setEditSlug(doc.slug);
      setEditSlugTouched(false);
      setEditError(null);
    },
    [],
  );

  const submitRename = useCallback(async () => {
    if (!editingId || !docs) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Title is required.");
      return;
    }
    const slug = (editSlugTouched ? editSlug.trim() : editSlug.trim() || slugify(title)) || slugify(title);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setEditError("Slug must be lowercase alphanumeric with hyphens.");
      return;
    }
    const prev = docs;
    const target = docs.find((d) => d.id === editingId);
    if (!target) return;
    if (target.title === title && target.slug === slug) {
      setEditingId(null);
      return;
    }
    setEditBusy(true);
    setEditError(null);
    setDocs((cur) => (cur ? cur.map((d) => (d.id === editingId ? { ...d, title, slug } : d)) : cur));
    try {
      const res = await fetch(`/api/nodes/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text.slice(0, 400)}`);
      }
      setEditingId(null);
    } catch (e) {
      setDocs(prev);
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setEditBusy(false);
    }
  }, [docs, editSlug, editSlugTouched, editTitle, editingId]);

  const collectDescendants = useCallback(
    (rootId: string) => {
      if (!docs) return [];
      const byParent = new Map<string, string[]>();
      for (const d of docs) {
        const pid = parentIdOf(d.parent);
        if (!pid) continue;
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(d.id);
      }
      const out: string[] = [];
      const stack = [...(byParent.get(rootId) ?? [])];
      while (stack.length) {
        const cur = stack.pop()!;
        out.push(cur);
        const kids = byParent.get(cur);
        if (kids) stack.push(...kids);
      }
      return out;
    },
    [docs],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!docs) return;
      const doc = docs.find((d) => d.id === id);
      if (!doc) return;
      const descendants = collectDescendants(id);
      const allIds = [id, ...descendants];
      const label = descendants.length ? `${doc.title} + ${descendants.length} descendant(s)` : doc.title;
      if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
      setDeleteBusyId(id);
      setMoveError(null);
      const prev = docs;
      setDocs((cur) => (cur ? cur.filter((d) => !allIds.includes(d.id)) : cur));
      if (editingId && allIds.includes(editingId)) setEditingId(null);
      try {
        for (const delId of allIds) {
          const res = await fetch(`/api/nodes/${delId}`, { method: "DELETE", credentials: "include" });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`${delId}: ${res.status} ${text.slice(0, 400)}`);
          }
        }
      } catch (e) {
        setDocs(prev);
        setMoveError(e instanceof Error ? e.message : String(e));
      } finally {
        setDeleteBusyId(null);
      }
    },
    [collectDescendants, docs, editingId],
  );

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

  const isCreateOpen = createParent !== null && createParent !== ("__done__" as unknown as string);
  const editingDoc = editingId ? docs.find((d) => d.id === editingId) ?? null : null;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Taxonomy</h1>
          <p className="mt-1 text-sm text-zinc-500">Branch → Year → Subject → Chapter → Topic · drag to reorder / reparent</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => openCreate(null, "branch")}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            New branch
          </button>
          <a
            href="/admin/collections/nodes"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            Manage in Nodes
          </a>
        </div>
      </div>

      {isCreateOpen && (
        <div className="mb-4 rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              New node {createParent ? `under ${docs?.find((d) => d.id === createParent)?.title ?? createParent}` : "at root"}
            </p>
            <button type="button" onClick={() => setCreateParent(null)} className="text-xs text-zinc-500 hover:text-zinc-700">
              Close
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Title</span>
              <input
                value={createTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setCreateTitle(v);
                  if (!createSlugTouched) setCreateSlug(slugify(v));
                }}
                placeholder="e.g. Organic Chemistry"
                className="rounded-md border bg-white px-2.5 py-2 text-sm dark:bg-zinc-950"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Slug</span>
              <input
                value={createSlug}
                onChange={(e) => {
                  setCreateSlugTouched(true);
                  setCreateSlug(e.target.value);
                }}
                placeholder="organic-chemistry"
                className="rounded-md border bg-white px-2.5 py-2 font-mono text-sm dark:bg-zinc-950"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Type</span>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as NodeDoc["type"])}
                className="rounded-md border bg-white px-2.5 py-2 text-sm dark:bg-zinc-950"
              >
                {CREATE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={submitCreate}
                disabled={createBusy}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {createBusy ? "Creating…" : "Create"}
              </button>
              <span className="pb-2 text-xs text-zinc-500">Appended at end of siblings</span>
            </div>
          </div>
          {createError && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{createError}</p>}
          {createParent === ("__done__" as unknown as string) && <p className="mt-2 text-xs text-emerald-700">Created.</p>}
        </div>
      )}

      {editingId && editingDoc && (
        <div className="mb-4 rounded-lg border bg-amber-50 p-4 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Rename: {editingDoc.title}</p>
            <button type="button" onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-zinc-700">
              Cancel
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Title</span>
              <input
                value={editTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditTitle(v);
                  if (!editSlugTouched) setEditSlug(slugify(v));
                }}
                className="rounded-md border bg-white px-2.5 py-2 text-sm dark:bg-zinc-950"
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Slug</span>
              <input
                value={editSlug}
                onChange={(e) => {
                  setEditSlugTouched(true);
                  setEditSlug(e.target.value);
                }}
                className="rounded-md border bg-white px-2.5 py-2 font-mono text-sm dark:bg-zinc-950"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={submitRename}
              disabled={editBusy}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {editBusy ? "Saving…" : "Save"}
            </button>
            <a href={`/admin/collections/nodes/${editingId}`} className="text-xs text-zinc-500 underline">
              Open in Nodes
            </a>
          </div>
          {editError && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{editError}</p>}
        </div>
      )}

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
                className="flex items-center gap-1 border-b border-zinc-100 px-2 text-sm dark:border-zinc-900"
                title={`${node.data.doc.type} · ${node.data.doc.slug} · ${node.data.doc.status}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[node.data.doc.type]}`} />
                <span className="min-w-0 flex-1 truncate font-medium">{node.data.name}</span>
                <span className="hidden shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 sm:inline">
                  {node.data.doc.type}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next: NodeDoc["type"] =
                      node.data.doc.type === "branch"
                        ? "year"
                        : node.data.doc.type === "year"
                          ? "subject"
                          : node.data.doc.type === "subject"
                            ? "chapter"
                            : "topic";
                    openCreate(node.data.doc.id, next);
                  }}
                  className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  title="Add child under this node"
                >
                  + child
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    beginRename(node.data.doc);
                  }}
                  className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(node.data.doc.id);
                  }}
                  disabled={deleteBusyId === node.data.doc.id}
                  className="shrink-0 rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  {deleteBusyId === node.data.doc.id ? "…" : "Delete"}
                </button>
                <span
                  className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${node.data.doc.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"}`}
                >
                  {node.data.doc.status}
                </span>
              </div>
            )}
          </Tree>
          <p className="border-t px-3 py-2 text-xs text-zinc-500">
            {docs.length} node{docs.length === 1 ? "" : "s"} · drag to reorder · + child · Rename · Delete ·{" "}
            <span className="font-mono">/admin/taxonomy</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default TaxonomyView;
