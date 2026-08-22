"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tree } from "react-arborist";
import "./admin-components.css";

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

const TYPE_COLOR: Record<NodeDoc["type"], string> = {
  branch: "#8b5cf6",
  year: "#3b82f6",
  subject: "#10b981",
  chapter: "#f59e0b",
  topic: "#a1a1aa",
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
    const limit = 250;
    let page = 1;
    const all: NodeDoc[] = [];
    while (true) {
      const res = await fetch(`/api/nodes?limit=${limit}&depth=0&sort=orderIndex&page=${page}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      const docsPage = (json.docs ?? []) as NodeDoc[];
      all.push(...docsPage);
      const returnedLimit: number = typeof json.limit === "number" ? json.limit : limit;
      const hasNextPage: boolean | undefined = json.hasNextPage;
      const totalPages: number | undefined = typeof json.totalPages === "number" ? json.totalPages : undefined;
      const currentPage: number = typeof json.page === "number" ? json.page : page;
      if (json.pagination === false) break;
      if (typeof hasNextPage === "boolean" && hasNextPage === false) break;
      if (typeof totalPages === "number" && currentPage >= totalPages) break;
      if (docsPage.length < returnedLimit) break;
      if (docsPage.length === 0) break;
      page += 1;
    }
    return all;
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
      try {
        for (const delId of allIds) {
          const res = await fetch(`/api/nodes/${delId}`, { method: "DELETE", credentials: "include" });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`${delId}: ${res.status} ${text.slice(0, 400)}`);
          }
        }
        if (editingId && allIds.includes(editingId)) setEditingId(null);
        try {
          const fresh = await fetchDocs();
          setDocs(fresh);
        } catch {
          // Fallback to local filter if refetch fails after successful deletes
          setDocs((cur) => (cur ? cur.filter((d) => !allIds.includes(d.id)) : cur));
        }
      } catch (e) {
        setMoveError(e instanceof Error ? e.message : String(e));
        try {
          const fresh = await fetchDocs();
          setDocs(fresh);
          if (editingId && allIds.includes(editingId)) {
            const stillExists = fresh.some((d) => d.id === editingId);
            if (!stillExists) setEditingId(null);
          }
        } catch {
          // keep current docs (server state unknown); error already shown
          // Still clear editingId if it was in the partially-deleted set to avoid editing stale state
          if (editingId && allIds.includes(editingId)) setEditingId(null);
        }
      } finally {
        setDeleteBusyId(null);
      }
    },
    [collectDescendants, docs, editingId, fetchDocs],
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
        await Promise.all(
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
        try {
          const fresh = await fetchDocs();
          setDocs(fresh);
        } catch {
          // keep optimistic if reconciliation fetch fails after success
        }
      } catch (e) {
        setMoveError(e instanceof Error ? e.message : String(e));
        try {
          const fresh = await fetchDocs();
          setDocs(fresh);
        } catch {
          // fallback to previous state if refetch itself fails
          setDocs(prev);
        }
      } finally {
        setSaving(false);
      }
    },
    [docs, fetchDocs],
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
    <div className="raven-taxonomy-wrap">
      <div className="raven-taxonomy-header">
        <div>
          <h1 className="raven-title">Taxonomy</h1>
          <p className="raven-subtitle">Branch → Year → Subject → Chapter → Topic · drag to reorder / reparent</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => openCreate(null, "branch")}
            className="raven-btn raven-btn-primary"
          >
            New branch
          </button>
          <a
            href="/admin/collections/nodes"
            className="raven-btn"
          >
            Manage in Nodes
          </a>
        </div>
      </div>

      {isCreateOpen && (
        <div className="raven-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>
              New node {createParent ? `under ${docs?.find((d) => d.id === createParent)?.title ?? createParent}` : "at root"}
            </p>
            <button type="button" onClick={() => setCreateParent(null)} className="raven-btn raven-btn-sm">
              Close
            </button>
          </div>
          <div className="raven-form-grid raven-form-grid-2" style={{ marginTop: "0.75rem" }}>
            <div className="raven-field-group">
              <label className="raven-field-label">Title</label>
              <input
                value={createTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setCreateTitle(v);
                  if (!createSlugTouched) setCreateSlug(slugify(v));
                }}
                placeholder="e.g. Organic Chemistry"
                className="raven-input"
              />
            </div>
            <div className="raven-field-group">
              <label className="raven-field-label">Slug</label>
              <input
                value={createSlug}
                onChange={(e) => {
                  setCreateSlugTouched(true);
                  setCreateSlug(e.target.value);
                }}
                placeholder="organic-chemistry"
                className="raven-input"
                style={{ fontFamily: "monospace" }}
              />
            </div>
            <div className="raven-field-group">
              <label className="raven-field-label">Type</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as NodeDoc["type"])}
                className="raven-input"
              >
                {CREATE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={submitCreate}
                disabled={createBusy}
                className="raven-btn raven-btn-primary"
                style={{ height: "36px" }}
              >
                {createBusy ? "Creating…" : "Create"}
              </button>
              <span className="raven-subtitle" style={{ fontSize: "0.6875rem", paddingBottom: "0.5rem" }}>Appended at end of siblings</span>
            </div>
          </div>
          {createError && <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.5rem" }}>{createError}</p>}
          {createParent === ("__done__" as unknown as string) && <p style={{ color: "#34d399", fontSize: "0.75rem", marginTop: "0.5rem" }}>Created.</p>}
        </div>
      )}

      {editingId && editingDoc && (
        <div className="raven-card" style={{ marginBottom: "1.25rem", borderColor: "#f59e0b" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>Rename: {editingDoc.title}</p>
            <button type="button" onClick={() => setEditingId(null)} className="raven-btn raven-btn-sm">
              Cancel
            </button>
          </div>
          <div className="raven-form-grid raven-form-grid-2" style={{ marginTop: "0.75rem" }}>
            <div className="raven-field-group">
              <label className="raven-field-label">Title</label>
              <input
                value={editTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditTitle(v);
                  if (!editSlugTouched) setEditSlug(slugify(v));
                }}
                className="raven-input"
              />
            </div>
            <div className="raven-field-group">
              <label className="raven-field-label">Slug</label>
              <input
                value={editSlug}
                onChange={(e) => {
                  setEditSlugTouched(true);
                  setEditSlug(e.target.value);
                }}
                className="raven-input"
                style={{ fontFamily: "monospace" }}
              />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={submitRename}
              disabled={editBusy}
              className="raven-btn raven-btn-primary"
            >
              {editBusy ? "Saving…" : "Save"}
            </button>
            <a href={`/admin/collections/nodes/${editingId}`} className="raven-subtitle" style={{ textDecoration: "underline" }}>
              Open in Nodes
            </a>
          </div>
          {editError && <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.5rem" }}>{editError}</p>}
        </div>
      )}

      {saving && <p style={{ color: "#f59e0b", fontSize: "0.75rem", margin: "0 0 0.5rem 0" }}>Saving order…</p>}
      {moveError && <p style={{ color: "#f87171", fontSize: "0.75rem", margin: "0 0 0.5rem 0" }}>{moveError}</p>}

      {docs.length === 0 ? (
        <div className="raven-empty-state">
          No nodes yet. Create your first Branch in{" "}
          <a className="raven-subtitle" style={{ textDecoration: "underline" }} href="/admin/collections/nodes/create">
            Nodes → Create
          </a>
          , then come back here.
        </div>
      ) : (
        <div className="raven-taxonomy-tree-card">
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
                style={{ ...style, display: "flex", alignItems: "center", gap: "0.35rem", padding: "0 0.5rem", fontSize: "0.875rem", borderBottom: "1px solid var(--theme-elevation-150, #27272a)" }}
                title={`${node.data.doc.type} · ${node.data.doc.slug} · ${node.data.doc.status}`}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: TYPE_COLOR[node.data.doc.type], flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{node.data.name}</span>
                <span className="raven-badge raven-badge-default">
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
                  className="raven-btn raven-btn-sm"
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
                  className="raven-btn raven-btn-sm"
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
                  className="raven-btn raven-btn-danger raven-btn-sm"
                >
                  {deleteBusyId === node.data.doc.id ? "…" : "Delete"}
                </button>
                <span className={`raven-badge ${node.data.doc.status === "published" ? "raven-badge-published" : "raven-badge-default"}`}>
                  {node.data.doc.status}
                </span>
              </div>
            )}
          </Tree>
          <div className="raven-taxonomy-tree-footer">
            {docs.length} node{docs.length === 1 ? "" : "s"} · drag to reorder · + child · Rename · Delete · <span style={{ fontFamily: "monospace" }}>/admin/taxonomy</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxonomyView;
