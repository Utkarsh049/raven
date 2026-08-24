import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { generateWithAI, getAIConfig, DEFAULT_MODELS, type AIProvider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: "Unauthorized — sign in to Payload admin first." }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
    };
    const prompt = String(body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const resolved = await getAIConfig(payload as never);
    const providerRaw = String(body.provider ?? "").trim() as AIProvider | "";
    const provider = providerRaw && ["openai", "anthropic", "google"].includes(providerRaw) ? (providerRaw as AIProvider) : undefined;
    const model = String(body.model ?? "").trim() || undefined;
    const text = await generateWithAI({ provider, model, prompt, systemPrompt: body.systemPrompt, resolved: resolved ?? undefined });
    const effProvider = resolved?.provider ?? provider ?? "openai";
    const effModel = model ?? resolved?.model ?? DEFAULT_MODELS[effProvider as AIProvider];
    return NextResponse.json({ text, provider: effProvider, model: effModel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("Missing API key") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  const providers: Array<{ provider: string; model: string; hasKey: boolean }> = [];
  for (const p of ["openai", "anthropic", "google"] as const) {
    const hasKey =
      p === "openai"
        ? Boolean(process.env.OPENAI_API_KEY)
        : p === "anthropic"
          ? Boolean(process.env.ANTHROPIC_API_KEY)
          : Boolean(process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    providers.push({ provider: p, model: DEFAULT_MODELS[p], hasKey });
  }
  return NextResponse.json({ providers });
}
