export type AIProvider = "openai" | "anthropic" | "google" | "deepseek" | "moonshot" | "xai" | "mistral" | "groq" | "openrouter" | "cohere" | "other";

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  google: "gemini-3.6-flash",
  deepseek: "deepseek-chat",
  moonshot: "moonshot-v1-8k",
  xai: "grok-2-latest",
  mistral: "mistral-small-latest",
  groq: "llama-3.1-8b-instant",
  openrouter: "openai/gpt-4o-mini",
  cohere: "command-r",
  other: "gpt-4o-mini",
};

const GOOGLE_MODEL_ALIASES: Record<string, string> = {
  "gemini-1.5-flash": "gemini-2.0-flash",
  "gemini-1.5-flash-001": "gemini-2.0-flash",
  "gemini-1.5-flash-002": "gemini-2.0-flash",
  "gemini-1.5-flash-latest": "gemini-2.0-flash",
};

function resolveGoogleModel(model: string): string {
  const m = String(model ?? "").trim();
  return GOOGLE_MODEL_ALIASES[m] ?? m;
}

export const PROVIDER_BASE_URLS: Partial<Record<AIProvider, string>> = {
  deepseek: "https://api.deepseek.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  xai: "https://api.x.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  cohere: "https://api.cohere.ai/compatibility/v1",
};

export type GenerateOptions = {
  provider?: AIProvider;
  model?: string;
  prompt: string;
  systemPrompt?: string;
};

export type ResolvedAIConfig = { provider: AIProvider; apiKey: string; baseUrl?: string; model?: string };

function getApiKey(provider: AIProvider): string | null {
  if (provider === "openai") return process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? null;
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY ?? process.env.AI_API_KEY ?? null;
  if (provider === "google") return process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.AI_API_KEY ?? null;
  return null;
}

function inferProviderFromBaseUrl(baseUrl?: string): AIProvider | null {
  const u = String(baseUrl ?? "").toLowerCase();
  if (u.includes("anthropic")) return "anthropic";
  if (u.includes("generativelanguage") || u.includes("googleapis")) return "google";
  if (u.includes("deepseek")) return "deepseek";
  if (u.includes("moonshot")) return "moonshot";
  if (u.includes("x.ai")) return "xai";
  if (u.includes("mistral")) return "mistral";
  if (u.includes("groq")) return "groq";
  if (u.includes("openrouter")) return "openrouter";
  if (u.includes("cohere")) return "cohere";
  return null;
}

function resolveBaseUrl(provider: AIProvider, override?: string): string {
  if (override?.trim()) return override.trim().replace(/\/$/, "");
  if (PROVIDER_BASE_URLS[provider]) return PROVIDER_BASE_URLS[provider]!;
  return (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

function isGoogleProvider(p: AIProvider): boolean { return p === "google"; }
function isAnthropicProvider(p: AIProvider): boolean { return p === "anthropic"; }
function isOpenAICompatible(p: AIProvider): boolean { return !isGoogleProvider(p) && !isAnthropicProvider(p); }

export function getConfiguredProvider(): { provider: AIProvider; apiKey: string; baseUrl?: string } | null {
  const explicit: Array<{ provider: AIProvider; env: string; baseUrl?: string }> = [
    { provider: "openai", env: "OPENAI_API_KEY" },
    { provider: "anthropic", env: "ANTHROPIC_API_KEY" },
    { provider: "google", env: "GOOGLE_API_KEY" },
    { provider: "google", env: "GOOGLE_GENERATIVE_AI_API_KEY" },
  ];
  for (const { provider, env } of explicit) {
    const k = process.env[env]?.trim();
    if (k) return { provider, apiKey: k, baseUrl: process.env.AI_BASE_URL?.trim() || undefined };
  }
  if (process.env.AI_API_KEY?.trim()) {
    const baseUrl = process.env.AI_BASE_URL?.trim() || undefined;
    const provider = inferProviderFromBaseUrl(baseUrl) ?? "openai";
    return { provider, apiKey: process.env.AI_API_KEY.trim(), baseUrl };
  }
  for (const key of Object.keys(process.env)) {
    if (!key.endsWith("_API_KEY") || key === "PAYLOAD_SECRET") continue;
    const v = process.env[key]?.trim();
    if (!v) continue;
    if (["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "AI_API_KEY"].includes(key)) continue;
    const baseUrl = process.env.AI_BASE_URL?.trim() || undefined;
    const provider = inferProviderFromBaseUrl(baseUrl) ?? "openai";
    return { provider, apiKey: v, baseUrl };
  }
  return null;
}

export async function getAIConfig(payload?: { findGlobal: (args: { slug: string }) => Promise<Record<string, unknown>> }): Promise<ResolvedAIConfig | null> {
  if (payload) {
    try {
      const g = await (payload as unknown as { payload?: { findGlobal: (a: { slug: string; overrideAccess?: boolean }) => Promise<Record<string, unknown>> } }).payload?.findGlobal?.({ slug: "ai-settings", overrideAccess: false } as never)
        ?? await payload.findGlobal({ slug: "ai-settings" } as never);
      let key = String((g as { apiKey?: string })?.apiKey ?? "").trim();
      if ((!key || key === "••••••••" || key === "********") && payload) {
        try {
          const raw = await (payload as { findGlobal: (a: unknown) => Promise<Record<string, unknown>> }).findGlobal({ slug: "ai-settings", overrideAccess: false } as never);
          const rk = String((raw as { apiKey?: string })?.apiKey ?? "").trim();
          if (rk && rk !== "••••••••" && rk !== "********") key = rk;
        } catch {}
      }
      if (key && key !== "••••••••" && key !== "********") {
        const baseUrlRaw = String((g as { baseUrl?: string })?.baseUrl ?? "").trim() || undefined;
        const model = String((g as { model?: string })?.model ?? "").trim() || undefined;
        const rawProv = String((g as { provider?: string })?.provider ?? "").trim() as AIProvider | "";
        const inferred = inferProviderFromBaseUrl(baseUrlRaw);
        const allowed: AIProvider[] = ["openai", "anthropic", "google", "deepseek", "moonshot", "xai", "mistral", "groq", "openrouter", "cohere", "other"];
        const provider: AIProvider = (rawProv && allowed.includes(rawProv) ? rawProv : inferred ?? "openai");
        const baseUrl = baseUrlRaw ?? PROVIDER_BASE_URLS[provider];
        return { provider, apiKey: key, baseUrl, model };
      }
    } catch {}
  }
  const env = getConfiguredProvider();
  if (env) {
    const model = process.env.AI_MODEL?.trim() || undefined;
    return { provider: env.provider, apiKey: env.apiKey, baseUrl: env.baseUrl, model };
  }
  return null;
}

export function getAvailableProviders(): Array<{ provider: AIProvider; defaultModel: string; hasKey: boolean }> {
  return (Object.keys(DEFAULT_MODELS) as AIProvider[]).map((p) => ({
    provider: p,
    defaultModel: DEFAULT_MODELS[p],
    hasKey: Boolean(getApiKey(p)),
  }));
}

async function callOpenAI(prompt: string, systemPrompt: string | undefined, model: string, apiKey: string, baseUrlOverride?: string, provider?: AIProvider): Promise<string> {
  const effProvider: AIProvider = provider ?? "openai";
  const baseUrl = resolveBaseUrl(effProvider, baseUrlOverride);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt } as const] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = json.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("OpenAI returned empty response");
  return out;
}

async function callAnthropic(prompt: string, systemPrompt: string | undefined, model: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt ?? undefined,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const out = json.content?.find((c) => c.type === "text")?.text?.trim();
  if (!out) throw new Error("Anthropic returned empty response");
  return out;
}

async function callGoogle(prompt: string, systemPrompt: string | undefined, model: string, apiKey: string): Promise<string> {
  const effModel = resolveGoogleModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts: Array<{ text: string }> = [];
  if (systemPrompt) parts.push({ text: systemPrompt });
  parts.push({ text: prompt });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!out) throw new Error("Google returned empty response");
  return out;
}

export type GenerateInput = Omit<GenerateOptions, "provider"> & { provider?: AIProvider; baseUrl?: string };

export async function generateWithAI(opts: GenerateInput & { resolved?: ResolvedAIConfig }): Promise<string> {
  let provider = opts.provider;
  let apiKey: string | null = provider ? getApiKey(provider) : null;
  let baseUrl = opts.baseUrl;
  let resolved = opts.resolved;
  if ((!provider || !apiKey) && !resolved) {
    const cfg = getConfiguredProvider();
    if (!cfg) throw new Error("No AI API key configured. Set it in Admin → AI Settings (Globals), or set any *_API_KEY (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, DEEPSEEK_API_KEY, AI_API_KEY, etc) in .env");
    provider = cfg.provider;
    apiKey = cfg.apiKey;
    baseUrl = cfg.baseUrl ?? baseUrl;
  }
  if (resolved) {
    provider = resolved.provider;
    apiKey = resolved.apiKey;
    baseUrl = resolved.baseUrl ?? baseUrl;
    if (!opts.model && resolved.model) opts = { ...opts, model: resolved.model };
  }
  const model = opts.model?.trim() || (resolved?.model?.trim() ? resolved.model.trim() : DEFAULT_MODELS[provider!]);
  const prompt = opts.prompt?.trim();
  if (!prompt) throw new Error("Prompt is required");
  if (isAnthropicProvider(provider!)) return callAnthropic(prompt, opts.systemPrompt, model, apiKey!);
  if (isGoogleProvider(provider!)) return callGoogle(prompt, opts.systemPrompt, model, apiKey!);
  return callOpenAI(prompt, opts.systemPrompt, model, apiKey!, baseUrl, provider);
}

export async function streamWithAI(
  opts: GenerateInput & { resolved?: ResolvedAIConfig },
  onChunk: (chunk: string) => void,
): Promise<string> {
  let provider: AIProvider | undefined = opts.provider;
  let apiKey: string | null = provider ? getApiKey(provider) : null;
  let baseUrl = opts.baseUrl;
  let resolved = opts.resolved;
  if ((!provider || !apiKey) && !resolved) {
    const cfg = getConfiguredProvider();
    if (!cfg) throw new Error("No AI API key configured. Set it in Admin → AI Settings (Globals), or set any *_API_KEY (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, DEEPSEEK_API_KEY, AI_API_KEY, etc) in .env");
    provider = cfg.provider;
    apiKey = cfg.apiKey;
    baseUrl = cfg.baseUrl ?? baseUrl;
  }
  if (resolved) {
    provider = resolved.provider;
    apiKey = resolved.apiKey;
    baseUrl = resolved.baseUrl ?? baseUrl;
    if (!opts.model && resolved.model) opts = { ...opts, model: resolved.model };
  }
  const model = opts.model?.trim() || (resolved?.model?.trim() ? resolved.model.trim() : DEFAULT_MODELS[provider!]);
  const prompt = opts.prompt?.trim();
  if (!prompt) throw new Error("Prompt is required");

  if (isOpenAICompatible(provider!)) {
    const effBaseUrl = resolveBaseUrl(provider!, baseUrl);
    const res = await fetch(`${effBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt } as const] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 500)}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream body from OpenAI");
    const decoder = new TextDecoder();
    let full = "";
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === "data: [DONE]") continue;
        if (!t.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(t.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
          const chunk = json.choices?.[0]?.delta?.content ?? "";
          if (chunk) { full += chunk; onChunk(chunk); }
        } catch {}
      }
    }
    return full;
  }

  if (isAnthropicProvider(provider!)) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        stream: true,
        system: opts.systemPrompt ?? undefined,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 500)}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream body from Anthropic");
    const decoder = new TextDecoder();
    let full = "";
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(t.slice(6)) as { type?: string; delta?: { text?: string } };
          if (json.type === "content_block_delta" && json.delta?.text) {
            full += json.delta.text;
            onChunk(json.delta.text);
          }
        } catch {}
      }
    }
    return full;
  }

  // Google — no true streaming via REST without extra setup; fall back to non-stream
  const text = await callGoogle(prompt, opts.systemPrompt, model, apiKey!);
  onChunk(text);
  return text;
}

export const MODEL_CHOICES: Record<AIProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  google: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  moonshot: ["moonshot-v1-8k", "moonshot-v1-32k", "kimi-k2"],
  xai: ["grok-2-latest", "grok-3"],
  mistral: ["mistral-small-latest", "mistral-large-latest"],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
  cohere: ["command-r", "command-r-plus"],
  other: ["gpt-4o-mini"],
};

export type ListModelsResult = { models: string[]; fallback: string[]; live: boolean; error?: string };

export async function listModels(resolved: ResolvedAIConfig): Promise<ListModelsResult> {
  const provider = resolved.provider;
  const fallback = MODEL_CHOICES[provider] ?? MODEL_CHOICES.other;

  if (isGoogleProvider(provider)) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(resolved.apiKey)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return { models: fallback, fallback, live: false, error: `Google models ${res.status}: ${t.slice(0, 300)}` };
      }
      const json = (await res.json()) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
      const names = (json.models ?? [])
        .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => String(m.name ?? "").replace(/^models\//, "")).filter(Boolean);
      return names.length ? { models: names, fallback, live: true } : { models: fallback, fallback, live: false, error: "Google returned no models" };
    } catch (e) { return { models: fallback, fallback, live: false, error: e instanceof Error ? e.message : String(e) }; }
  }

  if (isAnthropicProvider(provider)) {
    return { models: fallback, fallback, live: false, error: "Anthropic does not expose a list-models endpoint" };
  }

  try {
    const baseUrl = resolveBaseUrl(provider, resolved.baseUrl);
    const headers: Record<string, string> = { Authorization: `Bearer ${resolved.apiKey}` };
    if (provider === "openrouter") {
      const ref = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
      headers["HTTP-Referer"] = ref;
      headers["X-Title"] = "Raven";
    }
    const res = await fetch(`${baseUrl}/models`, { headers, cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { models: fallback, fallback, live: false, error: `${provider} models ${res.status}: ${t.slice(0, 300)}` };
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = (json.data ?? []).map((m) => String(m.id ?? "").trim()).filter(Boolean);
    return ids.length ? { models: ids, fallback, live: true } : { models: fallback, fallback, live: false, error: "Provider returned no models" };
  } catch (e) { return { models: fallback, fallback, live: false, error: e instanceof Error ? e.message : String(e) }; }
}
