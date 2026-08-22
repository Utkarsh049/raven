"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useField } from "@payloadcms/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type BlockRow = {
  id?: string;
  blockType: "markdown" | "image" | "youtube";
  blockName?: string;
  content?: string;
  compiledHtml?: string;
  url?: string;
  alt?: string;
  caption?: string;
  videoId?: string;
  title?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function RowShell({
  id,
  children,
  onRemove,
}: {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">{id.slice(0, 8)}</span>
        <button type="button" onClick={onRemove} className="rounded border px-2 py-1 text-xs hover:bg-muted">
          Remove
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function fieldPathForBlock(basePath: string, index: number, key: string) {
  return `${basePath}.${index}.${key}`;
}

export function ChapterBlocksField(props: { path: string }) {
  const { path } = props;
  const field = useField<BlockRow[]>({ path });
  const value: BlockRow[] = useMemo(() => (Array.isArray(field.value) ? (field.value as BlockRow[]) : []), [field.value]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setValue = useCallback(
    (next: BlockRow[]) => {
      field.setValue(next as never);
    },
    [field],
  );

  const addBlock = useCallback(
    (blockType: BlockRow["blockType"]) => {
      const base: BlockRow =
        blockType === "markdown"
          ? { id: uid(), blockType, content: "" }
          : blockType === "image"
            ? { id: uid(), blockType, url: "", alt: "", caption: "" }
            : { id: uid(), blockType, videoId: "", title: "" };
      setValue([...value, base]);
    },
    [setValue, value],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = value.filter((_, i) => i !== index);
      setValue(next);
    },
    [setValue, value],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = value.findIndex((r) => (r.id ?? String(value.indexOf(r))) === String(active.id));
      const newIndex = value.findIndex((r) => (r.id ?? String(value.indexOf(r))) === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const next = [...value];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      setValue(next);
    },
    [setValue, value],
  );

  const ids = useMemo(() => value.map((r, i) => r.id ?? `row-${i}-${r.blockType}`), [value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Chapter blocks</span>
        <span className="text-xs text-muted-foreground">markdown · image · youtube — drag ⋮⋮ to reorder</span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => addBlock("markdown")} className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
            + Markdown
          </button>
          <button type="button" onClick={() => addBlock("image")} className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
            + Image
          </button>
          <button type="button" onClick={() => addBlock("youtube")} className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted">
            + YouTube
          </button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No blocks yet. Add one above — content saves with the Node document.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {value.map((row, index) => {
                const rowId = ids[index];
                const p = (k: string) => fieldPathForBlock(path, index, k);
                return (
                  <RowShell key={rowId} id={rowId} onRemove={() => removeAt(index)}>
                    {row.blockType === "markdown" && <MarkdownRow pathFor={p} />}
                    {row.blockType === "image" && <ImageRow pathFor={p} />}
                    {row.blockType === "youtube" && <YoutubeRow pathFor={p} />}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Type: <span className="font-mono">{row.blockType}</span>
                    </p>
                  </RowShell>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function FieldRow({ label, path, placeholder }: { label: string; path: string; placeholder?: string }) {
  const f = useField<string>({ path });
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input
        value={(f.value as string) ?? ""}
        onChange={(e) => f.setValue(e.target.value as never)}
        placeholder={placeholder}
        className="rounded-md border bg-background px-2.5 py-2 text-sm"
      />
    </label>
  );
}

function htmlFromText(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  const paras = lines
    .join("\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return paras || "<p></p>";
}

function textFromHtml(html: string) {
  return html
    .replace(/<\/p><p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function TiptapEditor({ path }: { path: string }) {
  const field = useField<string>({ path });
  const raw = (field.value as string) ?? "";
  const editor = useEditor({
    extensions: [StarterKit],
    content: htmlFromText(raw),
    onUpdate: ({ editor: ed }) => {
      field.setValue(textFromHtml(ed.getHTML()) as never);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextHtml = htmlFromText(raw);
    if (textFromHtml(editor.getHTML()) !== raw) {
      editor.commands.setContent(nextHtml, { emitUpdate: false } as never);
    }
  }, [editor, raw]);

  if (!editor) return <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">Loading editor…</div>;

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-1.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          B
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          I
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          • List
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          1. List
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          H2
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          H3
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          Quote
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          Code
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 focus-within:outline-none [&_.tiptap]:min-h-[120px] [&_.tiptap]:outline-none" />
    </div>
  );
}

function ToolbarButton({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function MarkdownRow({ pathFor }: { pathFor: (k: string) => string }) {
  return (
    <div className="space-y-2">
      <TiptapEditor path={pathFor("content")} />
    </div>
  );
}

function ImageRow({ pathFor }: { pathFor: (k: string) => string }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Image URL" path={pathFor("url")} placeholder="https://… or /storage/… — or use Upload below" />
        <FieldRow label="Alt text" path={pathFor("alt")} placeholder="Describe the image (required)" />
      </div>
      <FieldRow label="Caption (optional)" path={pathFor("caption")} placeholder="Caption" />
      <SupabaseUpload urlPath={pathFor("url")} altPath={pathFor("alt")} />
    </div>
  );
}

function SupabaseUpload({ urlPath, altPath }: { urlPath: string; altPath: string }) {
  const urlField = useField<string>({ path: urlPath });
  const altField = useField<string>({ path: altPath });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setErr(null);
      if (!file.type.startsWith("image/")) {
        setErr("Pick an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErr("Max 5 MB.");
        return;
      }
      setBusy(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const key = `chapters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from("media").getPublicUrl(key);
        urlField.setValue((data.publicUrl ?? "") as never);
        if (!(altField.value as string)?.trim()) {
          const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
          if (base) altField.setValue(base as never);
        }
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : String(ex));
      } finally {
        setBusy(false);
        e.target.value = "";
      }
    },
    [altField, urlField],
  );

  const currentUrl = (urlField.value as string) ?? "";

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted">
          <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
          {busy ? "Uploading…" : "Upload to Supabase Storage"}
        </label>
        <span className="text-[11px] text-muted-foreground">Bucket: media — creates URL automatically. Ensure the bucket exists and is public.</span>
      </div>
      {err && <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      {currentUrl && (
        <div className="mt-3">
          <img src={currentUrl} alt={(altField.value as string) ?? ""} className="max-h-48 rounded border object-contain" />
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{currentUrl}</p>
        </div>
      )}
    </div>
  );
}

function extractYoutubeId(input: string) {
  const s = input.trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
  } catch {}
  return s;
}

function YoutubeRow({ pathFor }: { pathFor: (k: string) => string }) {
  const idField = useField<string>({ path: pathFor("videoId") });
  const titleField = useField<string>({ path: pathFor("title") });
  const raw = ((idField.value as string) ?? "").trim();
  const norm = raw ? extractYoutubeId(raw) : "";
  const isValidId = /^[a-zA-Z0-9_-]{11}$/.test(norm);
  const thumb = isValidId ? `https://i.ytimg.com/vi/${norm}/hqdefault.jpg` : "";

  const normalize = useCallback(() => {
    if (!raw) return;
    const next = extractYoutubeId(raw);
    if (next !== raw && /^[a-zA-Z0-9_-]{11}$/.test(next)) idField.setValue(next as never);
  }, [idField, raw]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">YouTube video ID or URL</span>
          <div className="flex gap-2">
            <input
              value={(idField.value as string) ?? ""}
              onChange={(e) => idField.setValue(e.target.value as never)}
              onBlur={normalize}
              placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=…"
              className="min-w-0 flex-1 rounded-md border bg-background px-2.5 py-2 text-sm"
            />
            <button type="button" onClick={normalize} className="shrink-0 rounded-md border px-3 py-2 text-xs hover:bg-muted">
              Normalize
            </button>
          </div>
          {raw && !isValidId && <span className="text-[11px] text-amber-600">Enter an 11-char ID or a YouTube URL — saved as the ID.</span>}
          {isValidId && raw !== norm && <span className="text-[11px] text-muted-foreground">Will save as: {norm}</span>}
        </div>
        <FieldRow label="Title" path={pathFor("title")} placeholder="Video title (shown on the card)" />
      </div>
      {isValidId ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="relative aspect-video bg-zinc-900">
            <img src={thumb} alt={(titleField.value as string) ?? raw} className="h-full w-full object-cover" />
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900">▶ Preview</div>
            </div>
          </div>
          <div className="bg-muted/30 px-3 py-2 text-xs">
            <span className="font-medium">{(titleField.value as string) || "Untitled"}</span>
            <span className="text-muted-foreground"> · {norm}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Paste an ID or URL to see the thumbnail facade — no iframe loads in this view.</p>
      )}
    </div>
  );
}

export default ChapterBlocksField;
