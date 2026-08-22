"use client";

import { useMemo } from "react";
import { useField } from "@payloadcms/ui";
import { BlockRenderer, type ReaderBlock } from "@/components/reader/Blocks";
import { ChapterBlocksField } from "./ChapterBlocksField";
import "./admin-components.css";

export function ChapterSplitView(props?: { path?: string }) {
  const path = props?.path || "blocks";
  const blocksField = useField<ReaderBlock[]>({ path });
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
      <div className="raven-admin-wrap">
        <div className="raven-empty-state">
          <p className="raven-subtitle">
            Split preview appears for chapters and topics. Set <strong>Type</strong> to <em>Chapter</em> or <em>Topic</em> to see the live preview alongside the block editor.
          </p>
        </div>
      </div>
    );
  }

  const status = String(statusField.value ?? "draft");

  return (
    <div className="raven-admin-wrap">
      <div className="raven-split-view">
        <div className="raven-card">
          <div className="raven-card-header">
            <div>
              <h3 className="raven-title" style={{ fontSize: "1rem" }}>Chapter Block Editor</h3>
              <p className="raven-subtitle">Edits in this editor save automatically with the Node document.</p>
            </div>
          </div>
          <ChapterBlocksField path={path} />
        </div>

        <div className="raven-card raven-preview-panel">
          <div className="raven-card-header">
            <div>
              <p className="raven-label-sm">Live Preview</p>
              <h2 className="raven-title">
                {(titleField.value as string) || "Untitled chapter"}
              </h2>
              <p className="raven-meta">
                /{String(slugField.value ?? "")} · {String(typeField.value ?? "chapter")}
              </p>
            </div>
            <span className={`raven-badge ${status === "published" ? "raven-badge-published" : "raven-badge-default"}`}>
              {status}
            </span>
          </div>
          <div className="raven-preview-scroll">
            <div className="raven-live-preview-blocks">
              <BlockRenderer blocks={raw} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChapterSplitView;
