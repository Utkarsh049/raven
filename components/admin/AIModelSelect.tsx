"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FieldDescription, FieldLabel, ReactSelect, useField, useFormFields } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";

type ModelsRes = { models?: string[]; fallback?: string[]; live?: boolean; error?: string; hint?: string };

export function AIModelSelect(props: TextFieldClientProps) {
  const field = useField<string>({ path: props.field.name as string });
  const value = String(field.value ?? "");
  const providerField = useFormFields(([fields]) => (fields as Record<string, { value?: unknown }>)?.provider?.value);
  const providerVal = String(providerField ?? "");
  const [models, setModels] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/models", { cache: "no-store", credentials: "include" });
      const j = (await r.json()) as ModelsRes;
      if (!r.ok) {
        setErr(j.error ?? `Failed (${r.status})`);
        setModels(j.fallback ?? []);
        setLive(false);
        return;
      }
      const list = Array.isArray(j.models) && j.models.length ? j.models : j.fallback ?? [];
      setModels(list);
      setLive(Boolean(j.live));
      if (j.error) setErr(j.error);
      else if (j.hint && list.length === 0) setErr(j.hint);
      else setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels, providerVal]);

  const options = [
    { label: "Default (provider default)", value: "" },
    ...models.map((m) => ({ label: m, value: m })),
  ];

  return (
    <div className="field-type">
      <FieldLabel label={props.field.label as string} required={Boolean(props.field.required)} />
      <FieldDescription path={props.field.name as string} description={props.field.admin?.description as string} />
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.35rem" }}>
        <div style={{ flex: 1 }}>
          <ReactSelect
            value={options.find((o) => o.value === value) ?? options[0]}
            onChange={(opt: unknown) => field.setValue(((opt as { value?: string })?.value ?? "") as never)}
            options={options}
            isSearchable
            placeholder="Default (provider default)"
          />
        </div>
        <button
          type="button"
          onClick={fetchModels}
          disabled={loading}
          className="btn btn--style-secondary btn--size-small"
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>
      {loading && <p style={{ fontSize: "0.75rem", color: "var(--theme-elevation-400)", margin: "0.35rem 0 0 0" }}>Loading models from provider…</p>}
      {err && <p style={{ fontSize: "0.75rem", color: live ? "var(--theme-elevation-400)" : "#f87171", margin: "0.35rem 0 0 0" }}>{err} {live ? "" : "(showing fallback)"}</p>}
      {!loading && live && models.length > 0 && <p style={{ fontSize: "0.75rem", color: "#16a34a", margin: "0.35rem 0 0 0" }}>Live list from provider ({models.length} models)</p>}
      {!loading && !live && !err && models.length === 0 && <p style={{ fontSize: "0.75rem", color: "var(--theme-elevation-400)", margin: "0.35rem 0 0 0" }}>Save provider + key, then Refresh — model list will populate.</p>}
    </div>
  );
}

export default AIModelSelect;
