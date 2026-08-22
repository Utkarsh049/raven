"use client";

import { useMemo } from "react";
import { useField, useFormFields } from "@payloadcms/ui";
import { BlockRenderer, type ReaderBlock } from "@/components/reader/Blocks";

export function ChapterSplitView() {
  const blocksField = useField<ReaderBlock[]>({ path: "blocks" });
  const titleField = useField<string>({ path: "title" });
  const slugField = useField<string>({ path: "slug" });
  const typeField = useField<string>({ path: "type" });
  const statusField = useField<string>({ path: "status" });

  const raw = useMemo(() => {
    const v = blocksField.value;
    return Array.isArray(v) ? (v as ReaderBlock[]) : [];
  }, [blocksField.value]);

  const isChapterish = typeField.value === "chapter" || typeField.value === "topic";

  if (!isChapterish) {
    return (
      <p className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        Split preview appears for chapters/topics. Set Type to Chapter or Topic to see the live preview alongside the block editor.
      </p>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Editor</span>
          <span>— blocks above apply here; Save to persist</span>
        </div>
        <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
          Edit blocks in the field above, then save. Preview updates live on the right using the same renderers as the public page.
        </div>
      </div>

      <div className="min-w-0 rounded-lg border bg-white p-4 dark:bg-zinc-950">
        <div className="mb-3 border-b pb-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Live preview</p>
          <h2 className="mt-1 text-lg font-semibold leading-tight">{(titleField.value as string) || "Untitled chapter"}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            /{String(slugField.value ?? "")} · {String(typeField.value ?? "")} · {String(statusField.value ?? "draft")}
          </p>
        </div>
        <BlockRenderer blocks={raw} />
      </div>
    </div>
  );
}

export default ChapterSplitView;

function _useFormFieldsShim() {
  void useFormFields;
}
