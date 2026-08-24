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
        description: "Optional. Only for \"Other\" or to override. e.g. https://api.together.xyz/v1",
        placeholder: "https://api.openai.com/v1",
      },
    },
    {
      name: "model",
      type: "text",
      admin: {
        description: "Optional. Model name. Leave blank for provider default.",
        placeholder: "gpt-4o-mini",
      },
    },
  ],
};
