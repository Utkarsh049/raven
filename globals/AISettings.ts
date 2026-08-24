import type { GlobalConfig } from "payload";

export const AISettings: GlobalConfig = {
  slug: "ai-settings",
  label: "AI Settings",
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const incoming = String((data as { apiKey?: string })?.apiKey ?? "").trim();
        const isMasked = incoming === "••••••••" || incoming === "********";
        if (!incoming || isMasked) {
          try {
            const existing = await req.payload.findGlobal({ slug: "ai-settings", overrideAccess: false } as never);
            const prev = String((existing as { apiKey?: string })?.apiKey ?? "").trim();
            if (prev && prev !== "••••••••" && prev !== "********") (data as { apiKey?: string }).apiKey = prev;
            else delete (data as { apiKey?: string }).apiKey;
          } catch {
            delete (data as { apiKey?: string }).apiKey;
          }
        } else {
          (data as { apiKey?: string }).apiKey = incoming;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "provider",
      type: "select",
      defaultValue: "openai",
      required: true,
      options: [
        { label: "OpenAI", value: "openai" },
        { label: "Anthropic (Claude)", value: "anthropic" },
        { label: "Google (Gemini)", value: "google" },
        { label: "DeepSeek", value: "deepseek" },
        { label: "Moonshot (Kimi)", value: "moonshot" },
        { label: "xAI (Grok)", value: "xai" },
        { label: "Mistral", value: "mistral" },
        { label: "Groq", value: "groq" },
        { label: "OpenRouter", value: "openrouter" },
        { label: "Cohere", value: "cohere" },
        { label: "Other (OpenAI-compatible)", value: "other" },
      ],
      admin: { description: "Provider for the key. Uses correct endpoint/format automatically — no Base URL needed for listed providers." },
      validate: (val: unknown) => {
        const allowed = ["openai", "anthropic", "google", "deepseek", "moonshot", "xai", "mistral", "groq", "openrouter", "cohere", "other"];
        if (typeof val !== "string" || !allowed.includes(val)) return "Pick a provider";
        return true;
      },
    },
    {
      name: "apiKey",
      type: "text",
      admin: {
        description: "Stored server-side only, never exposed to browser. Paste any provider's key. Leave blank to keep current key.",
      },
    },
    {
      name: "baseUrl",
      type: "text",
      admin: {
        description: "Required for \"Other\" — base URL of the provider. e.g. https://api.together.xyz/v1",
        placeholder: "https://api.together.xyz/v1",
        condition: (data) => (data as { provider?: string })?.provider === "other",
      },
      validate: (val: unknown, { data }: { data?: Record<string, unknown> }) => {
        if ((data as { provider?: string })?.provider === "other" && !String(val ?? "").trim()) return "Base URL is required when provider is Other";
        if (val && String(val).trim()) {
          try {
            const u = new URL(String(val).trim());
            if (!/^https?:$/.test(u.protocol)) return "Base URL must be http(s)";
          } catch { return "Base URL must be a valid URL"; }
        }
        return true;
      },
    },
    {
      name: "model",
      type: "text",
      admin: {
        description: "Pick from models available to your key — fetched live from the provider. Save Provider + API Key first, then reopen to load models. Or leave as Default.",
        components: {
          Field: "@/components/admin/AIModelSelect# AIModelSelect",
        },
      },
      validate: ((() => true) as unknown as NonNullable<import("payload").TextField["validate"]>) as never,
    },
  ],
};
