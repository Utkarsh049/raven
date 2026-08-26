"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useField } from "@payloadcms/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export type BlockRow = {
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
  blockType,
  children,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  id: string;
  blockType: string;
  children: React.ReactNode;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const badgeClass =
    blockType === "markdown"
      ? "raven-badge-markdown"
      : blockType === "image"
        ? "raven-badge-image"
        : blockType === "youtube"
          ? "raven-badge-youtube"
          : "raven-badge-default";

  return (
    <div ref={setNodeRef} style={style} className="raven-block-card">
      <div className="raven-block-header">
        <div className="raven-reorder-controls">
          <button
            type="button"
            aria-label="Drag to reorder"
            title="Press and hold to drag"
            className="raven-drag-btn"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <div className="raven-move-arrows">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={isFirst}
              className="raven-move-btn"
              aria-label="Move block up"
              title="Move block up"
            >
              ▲
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={isLast}
              className="raven-move-btn"
              aria-label="Move block down"
              title="Move block down"
            >
              ▼
            </button>
          </div>
        </div>
        <span className={`raven-badge ${badgeClass}`}>{blockType}</span>
        <span className="raven-meta" style={{ flex: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {id.slice(0, 8)}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="raven-btn raven-btn-danger raven-btn-sm"
        >
          Remove
        </button>
      </div>
      <div className="raven-block-body">{children}</div>
    </div>
  );
}

export function ChapterBlocksField(props: { path: string }) {
  const { path } = props;
  const field = useField<BlockRow[]>({ path });
  const value: BlockRow[] = useMemo(() => {
    if (!Array.isArray(field.value)) return [];
    return (field.value as BlockRow[]).map((r, i) => ({
      ...r,
      id: r.id || `blk-${i}-${r.blockType || "markdown"}`,
    }));
  }, [field.value]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
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
      const newId = uid();
      const base: BlockRow =
        blockType === "markdown"
          ? { id: newId, blockType, content: "" }
          : blockType === "image"
            ? { id: newId, blockType, url: "", alt: "", caption: "" }
            : { id: newId, blockType, videoId: "", title: "" };
      setValue([...value, base]);
      setTimeout(() => {
        const el = document.getElementById(newId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 60);
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

  const updateAt = useCallback(
    (index: number, patch: Partial<BlockRow>) => {
      const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
      setValue(next);
    },
    [setValue, value],
  );

  const moveBlock = useCallback(
    (index: number, direction: "up" | "down") => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= value.length) return;
      const next = [...value];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      setValue(next);
    },
    [setValue, value],
  );

  const ids = useMemo(() => value.map((r, i) => r.id ?? `row-${i}-${r.blockType}`), [value]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const next = [...value];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      setValue(next);
    },
    [setValue, value, ids],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Sticky top toolbar */}
      <div className="raven-blocks-sticky-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            Blocks ({value.length})
          </span>
          <span className="raven-subtitle raven-hide-mobile" style={{ fontSize: "0.75rem" }}>
            hold ⋮⋮ to drag · tap ▲▼
          </span>
        </div>
        <div className="raven-blocks-toolbar-actions">
          <button
            type="button"
            onClick={() => addBlock("markdown")}
            className="raven-btn raven-btn-primary"
            title="Add Markdown Block"
          >
            <span className="raven-btn-short">+ MD</span>
            <span className="raven-btn-long">+ Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => addBlock("image")}
            className="raven-btn"
            title="Add Image Block"
          >
            <span className="raven-btn-short">+ Img</span>
            <span className="raven-btn-long">+ Image</span>
          </button>
          <button
            type="button"
            onClick={() => addBlock("youtube")}
            className="raven-btn"
            title="Add YouTube Video Block"
          >
            <span className="raven-btn-short">+ YT</span>
            <span className="raven-btn-long">+ YouTube</span>
          </button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="raven-empty-state">
          <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, fontSize: "0.875rem" }}>No blocks yet</p>
          <p className="raven-subtitle">Use the sticky toolbar above to add a Markdown, Image, or YouTube block.</p>
        </div>
      ) : (
        <>
          <DndContext id="chapter-blocks-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="raven-blocks-stack">
                {value.map((row, index) => {
                  const rowId = ids[index];
                  return (
                    <RowShell
                      key={rowId}
                      id={rowId}
                      blockType={row.blockType}
                      onRemove={() => removeAt(index)}
                      onMoveUp={() => moveBlock(index, "up")}
                      onMoveDown={() => moveBlock(index, "down")}
                      isFirst={index === 0}
                      isLast={index === value.length - 1}
                    >
                      {row.blockType === "markdown" && (
                        <MarkdownRow row={row} onChange={(patch) => updateAt(index, patch)} />
                      )}
                      {row.blockType === "image" && (
                        <ImageRow row={row} onChange={(patch) => updateAt(index, patch)} />
                      )}
                      {row.blockType === "youtube" && (
                        <YoutubeRow row={row} onChange={(patch) => updateAt(index, patch)} />
                      )}
                    </RowShell>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Bottom quick-add bar */}
          <div className="raven-blocks-bottom-toolbar">
            <span className="raven-subtitle" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Append block:</span>
            <button
              type="button"
              onClick={() => addBlock("markdown")}
              className="raven-btn raven-btn-sm"
            >
              + Markdown
            </button>
            <button
              type="button"
              onClick={() => addBlock("image")}
              className="raven-btn raven-btn-sm"
            >
              + Image
            </button>
            <button
              type="button"
              onClick={() => addBlock("youtube")}
              className="raven-btn raven-btn-sm"
            >
              + YouTube
            </button>
          </div>
        </>
      )}
    </div>
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

function isHtmlContent(value: string): boolean {
  return value.trim().startsWith("<");
}

function toEditorHtml(raw: string): string {
  if (!raw) return "<p></p>";
  return isHtmlContent(raw) ? raw : htmlFromText(raw);
}

function TiptapEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: toEditorHtml(content),
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const cur = editor.getHTML();
    const next = toEditorHtml(content);
    if (cur !== next && (cur === "<p></p>" || cur === "")) {
      editor.commands.setContent(next, { emitUpdate: false } as never);
    }
  }, [editor, content]);

  if (!editor) return <div className="raven-empty-state" style={{ padding: "1rem" }}>Loading editor…</div>;

  return (
    <div className="raven-editor-box">
      <div className="raven-toolbar">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet List">
          • List
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Numbered List">
          1. List
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading 2">
          H2
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Heading 3">
          H3
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote">
          Quote
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} label="Code block">
          Code
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ children, onClick, active, label }: { children: React.ReactNode; onClick: () => void; active?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`raven-toolbar-btn ${active ? "active" : ""}`}
    >
      {children}
    </button>
  );
}

function MarkdownRow({
  row,
  onChange,
}: {
  row: BlockRow;
  onChange: (patch: Partial<BlockRow>) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [aiErr, setAiErr] = useState<string | null>(null);

  const onGenerate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) { setAiErr("Enter a prompt for AI."); return; }
    setBusy(true); setAiErr(null); setStreamed("");
    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `AI stream failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: string };
            if (data.error) throw new Error(data.error);
            if (data.done) break;
            if (data.chunk) { full += data.chunk; setStreamed(full); }
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }
      if (!full) throw new Error("AI returned empty text.");
      onChange({ content: full });
      setPrompt(""); setStreamed("");
    } catch (e) {
      try {
        const fb = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: p }),
        });
        const j = (await fb.json()) as { text?: string; error?: string };
        if (!fb.ok) throw new Error(j.error || String(e));
        const text = String(j.text ?? "");
        if (!text) throw new Error(String(e));
        onChange({ content: text }); setPrompt(""); setStreamed(""); setAiErr(null);
        return;
      } catch { /* keep original error */ }
      setAiErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }, [onChange, prompt]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <TiptapEditor
        content={row.content ?? ""}
        onChange={(content) => onChange({ content })}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt for AI — e.g. Draft an intro to photosynthesis"
          className="raven-input"
          style={{ flex: 1, minWidth: "200px" }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onGenerate(); } }}
        />
        <button type="button" onClick={onGenerate} disabled={busy} className="raven-btn">
          {busy ? "Generating…" : "Generate with AI"}
        </button>
      </div>
      {busy && streamed && <div className="rounded border bg-muted/20 p-2 text-xs whitespace-pre-wrap max-h-32 overflow-auto">{streamed}</div>}
      {aiErr && <p style={{ color: "#f87171", fontSize: "0.75rem", margin: 0 }}>{aiErr}</p>}
      <p className="raven-subtitle" style={{ fontSize: "0.6875rem" }}>AI output lands here for review — edit before saving. Never auto-published.</p>
    </div>
  );
}

function ImageRow({
  row,
  onChange,
}: {
  row: BlockRow;
  onChange: (patch: Partial<BlockRow>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="raven-form-grid raven-form-grid-2">
        <div className="raven-field-group">
          <label className="raven-field-label">Image URL</label>
          <input
            value={row.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://… or /storage/… — or use Upload below"
            className="raven-input"
          />
        </div>
        <div className="raven-field-group">
          <label className="raven-field-label">Alt text <span aria-hidden className="text-destructive">*</span></label>
          <input
            value={row.alt ?? ""}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Describe the image (required)"
            className="raven-input"
            required
            aria-required="true"
            aria-describedby={!row.alt?.trim() ? `alt-hint-${row.id}` : undefined}
          />
          {!row.alt?.trim() && <span id={`alt-hint-${row.id}`} className="text-xs text-destructive">Alt text is required for accessibility</span>}
        </div>
      </div>
      <div className="raven-field-group">
        <label className="raven-field-label">Caption (optional)</label>
        <input
          value={row.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="Caption"
          className="raven-input"
        />
      </div>
      <SupabaseUpload
        url={row.url ?? ""}
        alt={row.alt ?? ""}
        onUploadSuccess={(url, autoAlt) => {
          const patch: Partial<BlockRow> = { url };
          if (autoAlt && !row.alt) patch.alt = autoAlt;
          onChange(patch);
        }}
      />
    </div>
  );
}

function SupabaseUpload({
  url,
  alt,
  onUploadSuccess,
}: {
  url: string;
  alt: string;
  onUploadSuccess: (url: string, alt?: string) => void;
}) {
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
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/media-upload", { method: "POST", body: form });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
        if (!json.url) throw new Error("Upload returned no URL.");
        let autoAlt: string | undefined;
        if (!alt?.trim()) {
          const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
          if (base) autoAlt = base;
        }
        onUploadSuccess(json.url, autoAlt);
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : String(ex));
      } finally {
        setBusy(false);
        e.target.value = "";
      }
    },
    [alt, onUploadSuccess],
  );

  return (
    <div className="raven-upload-box">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
        <label className="raven-btn" style={{ cursor: "pointer" }}>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} disabled={busy} />
          {busy ? "Uploading…" : "Upload to Supabase Storage"}
        </label>
        <span className="raven-subtitle" style={{ fontSize: "0.6875rem" }}>Bucket: media — creates public URL automatically.</span>
      </div>
      {err && <p style={{ color: "#f87171", fontSize: "0.75rem", margin: "0.5rem 0 0 0" }}>{err}</p>}
      {url && (
        <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
          <img src={url} alt={alt || ""} style={{ maxHeight: "180px", maxWidth: "100%", borderRadius: "6px", objectFit: "contain" }} />
          <p className="raven-meta" style={{ marginTop: "0.25rem", wordBreak: "break-all" }}>{url}</p>
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

function YoutubeRow({
  row,
  onChange,
}: {
  row: BlockRow;
  onChange: (patch: Partial<BlockRow>) => void;
}) {
  const raw = (row.videoId ?? "").trim();
  const norm = raw ? extractYoutubeId(raw) : "";
  const isValidId = /^[a-zA-Z0-9_-]{11}$/.test(norm);
  const thumb = isValidId ? `https://i.ytimg.com/vi/${norm}/hqdefault.jpg` : "";

  const normalize = useCallback(() => {
    if (!raw) return;
    const next = extractYoutubeId(raw);
    if (next !== raw && /^[a-zA-Z0-9_-]{11}$/.test(next)) {
      onChange({ videoId: next });
    }
  }, [onChange, raw]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="raven-form-grid raven-form-grid-2">
        <div className="raven-field-group">
          <label className="raven-field-label">YouTube video ID or URL</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={row.videoId ?? ""}
              onChange={(e) => onChange({ videoId: e.target.value })}
              onBlur={normalize}
              placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=…"
              className="raven-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={normalize}
              className="raven-btn"
            >
              Normalize
            </button>
          </div>
          {raw && !isValidId && <span style={{ fontSize: "0.6875rem", color: "#fbbf24" }}>Enter an 11-char ID or a YouTube URL — saved as the ID.</span>}
          {isValidId && raw !== norm && <span className="raven-meta">Will save as: {norm}</span>}
        </div>
        <div className="raven-field-group">
          <label className="raven-field-label">Title</label>
          <input
            value={row.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Video title (shown on the card)"
            className="raven-input"
          />
        </div>
      </div>
      {isValidId ? (
        <div className="raven-yt-box">
          <div className="raven-yt-thumb">
            <img src={thumb} alt={row.title ?? raw} />
            <div className="raven-yt-play">
              <span className="raven-yt-play-pill">▶ Preview</span>
            </div>
          </div>
          <div className="raven-yt-info">
            <span style={{ fontWeight: 600 }}>{row.title || "Untitled"}</span>
            <span className="raven-meta" style={{ margin: 0 }}>{norm}</span>
          </div>
        </div>
      ) : (
        <p className="raven-subtitle" style={{ fontSize: "0.6875rem" }}>Paste an ID or URL to see the thumbnail facade — no iframe loads in this view.</p>
      )}
    </div>
  );
}

export default ChapterBlocksField;
