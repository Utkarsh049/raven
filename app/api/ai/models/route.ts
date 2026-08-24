import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { getAIConfig, listModels, MODEL_CHOICES } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: "Unauthorized — sign in to Payload admin first." }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const previewProvider = sp.get("provider")?.trim();
    const previewKey = sp.get("apiKey")?.trim();
    const previewBaseUrl = sp.get("baseUrl")?.trim();
    let resolved: Awaited<ReturnType<typeof getAIConfig>> = null;

    // If preview params supplied (current form values before save), use them — no DB write, key stays in-memory for this request only
    if (previewKey && previewProvider) {
      const allowed = ["openai", "anthropic", "google", "deepseek", "moonshot", "xai", "mistral", "groq", "openrouter", "cohere", "other"] as const;
      if ((allowed as readonly string[]).includes(previewProvider)) {
        const prov = previewProvider as import("@/lib/ai").AIProvider;
        const { PROVIDER_BASE_URLS } = await import("@/lib/ai");
        if (previewKey !== "••••••••" && previewKey !== "********") {
          resolved = { provider: prov, apiKey: previewKey, baseUrl: previewBaseUrl || PROVIDER_BASE_URLS[prov], model: undefined };
        }
      }
    }
    if (!resolved) resolved = await getAIConfig(payload as never);
    if (!resolved) return NextResponse.json({ models: [], provider: null, hint: "No API key configured. Set it in Admin → AI Settings.", fallback: [], live: false });
    const result = await listModels(resolved);
    return NextResponse.json({ ...result, provider: resolved.provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
