import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";
import { getAIConfig, listModels, MODEL_CHOICES } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) return NextResponse.json({ error: "Unauthorized — sign in to Payload admin first." }, { status: 401 });
    const resolved = await getAIConfig(payload as never);
    if (!resolved) return NextResponse.json({ models: [], provider: null, hint: "No API key configured. Set it in Admin → AI Settings.", fallback: [], live: false });
    const result = await listModels(resolved);
    return NextResponse.json({ ...result, provider: resolved.provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
