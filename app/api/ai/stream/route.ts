import { NextRequest } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { streamWithAI, getAIConfig, type AIProvider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized — sign in to Payload admin first." }), { status: 401, headers: { "Content-Type": "application/json" } });

    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
    };
    const prompt = String(body.prompt ?? "").trim();
    if (!prompt) return new Response(JSON.stringify({ error: "prompt is required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const resolved = await getAIConfig(payload as never);
    const providerRaw = String(body.provider ?? "").trim() as AIProvider | "";
    const provider = providerRaw && ["openai", "anthropic", "google"].includes(providerRaw) ? (providerRaw as AIProvider) : undefined;
    const model = String(body.model ?? "").trim() || undefined;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamWithAI({ provider, model, prompt, systemPrompt: body.systemPrompt, resolved: resolved ?? undefined }, (chunk) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
}
